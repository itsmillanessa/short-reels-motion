// A small Chrome DevTools Protocol client — no dependencies. Two transports:
//   pipe       --remote-debugging-pipe: JSON messages separated by NUL on fds 3 (to Chrome) and 4 (from Chrome).
//              No port is opened, so it works where 127.0.0.1 is closed to us (sandboxes).
//   websocket  --remote-debugging-port=0: Chrome prints the endpoint on stderr, we connect with Node's WebSocket.
// Written against the public protocol documentation (chromedevtools.github.io/devtools-protocol).
import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { mkdtempSync, readFileSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export class CdpError extends Error {}

// Flags that make a render deterministic and keep a headless page from being throttled as "background".
export const CHROME_FLAGS = [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio',
  '--force-device-scale-factor=1', '--force-color-profile=srgb', '--font-render-hinting=none', '--disable-lcd-text',
  '--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files', '--disable-features=Translate,MediaRouter',
  // draw only when every compositor stage (raster, image decode) is done: a screenshot is never taken from half-decoded tiles
  '--run-all-compositor-stages-before-draw', '--disable-checker-imaging',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
  '--enable-unsafe-swiftshader', '--disable-breakpad', '--disable-component-update', '--disable-sync', '--metrics-recording-only', '--no-pings',
];

// Written into every fresh profile before Chrome starts. On Windows, Chrome 153+ checks ~40 s after starting on a
// profile without this cache whether the account has a blank password, by signing in as the user with an empty one
// (password_manager_util_win CheckBlankPasswordWithPrefs → LogonUser). Each check is a failed sign-in (event 4625):
// one per render worker per render, enough to lock the account (Windows 11: 10 failures in 10 minutes).
// A last-changed time far in the future means the cached answer is always current, so Chrome never asks.
export const LOCAL_STATE = { password_manager: { os_password_blank: false, os_password_last_changed: '9000000000000000000' } };

// Ctrl-C or a kill does not run 'exit' handlers: what must not be left behind (browsers, temp profiles, a render's
// scratch folder) registers here and is cleaned up on SIGINT / SIGTERM before the process exits.
const leftovers = new Set();
const onSignal = (sig) => { for (const fn of leftovers) { try { fn(); } catch { /* best effort */ } } process.exit(sig === 'SIGINT' ? 130 : 143); };
export function cleanupOnInterrupt(fn) {
  if (!leftovers.size) for (const s of ['SIGINT', 'SIGTERM']) process.on(s, onSignal);
  leftovers.add(fn);
  return () => { leftovers.delete(fn); if (!leftovers.size) for (const s of ['SIGINT', 'SIGTERM']) process.off(s, onSignal); };
}

// One 'exit' listener for every browser still running (a render starts up to 8 workers, plus stills and the sound pass:
// one listener each went past Node's limit of 10 and printed MaxListenersExceededWarning on every render).
const reapers = new Set();
const reapAll = () => { for (const fn of reapers) fn(); };
function reapOnExit(fn) {
  if (!reapers.size) process.on('exit', reapAll);
  reapers.add(fn);
  return () => { reapers.delete(fn); if (!reapers.size) process.off('exit', reapAll); };
}

// A temp profile is removed once its browser is gone. On Windows Chrome keeps its files open for a moment after it is
// killed: removing at once failed (EBUSY / EPERM), silently, and every launch left a folder in %TEMP% — hundreds of them.
// Wait for the exit, then retry the removal for a few seconds.
const RM_RETRY = { recursive: true, force: true, maxRetries: 10, retryDelay: 100 };

// Start Chrome and return a connection: { send, on, off, once, close, transport, pid }.
//   conn.send('Page.navigate', { url }, sessionId?) → Promise<result>
//   conn.on('Runtime.exceptionThrown', (params, sessionId) => …)
export async function launch(exe, { transport = 'pipe', args = [], timeout = 30_000 } = {}) {
  const profile = mkdtempSync(join(tmpdir(), 'om-chrome-'));
  writeFileSync(join(profile, 'Local State'), JSON.stringify(LOCAL_STATE));
  // Chrome refuses to run as root with its sandbox (containers, CI); nothing else about the render changes
  const root = process.platform === 'linux' && process.getuid?.() === 0 ? ['--no-sandbox'] : [];
  const flags = [...CHROME_FLAGS, ...root, `--user-data-dir=${profile}`, ...args, 'about:blank'];
  const conn = transport === 'websocket' ? await viaWebSocket(exe, flags, timeout) : viaPipe(exe, flags);
  conn.profile = profile;
  const forget = cleanupOnInterrupt(() => { conn._reap(); try { rmSync(profile, RM_RETRY); } catch { /* best effort */ } });
  const close = conn.close;
  // fast: a throwaway browser (a render worker) is killed at once instead of asked to shut down; its temp profile goes either way
  conn.close = async ({ fast = false } = {}) => {
    forget();
    await close({ fast });
    await Promise.race([conn._exited, new Promise((r) => setTimeout(r, 3000).unref())]);
    try { await rm(profile, RM_RETRY); } catch { /* still locked after the retries: nothing else to do */ }
  };
  return conn;
}

function core(child, write, extra = {}) {
  let id = 0, closed = false;
  // Never leave a browser behind, even when the caller dies on an exception.
  // Chrome starts helper processes (GPU, renderers) that inherit our pipes and can outlive the main process by minutes,
  // keeping Node alive: the browser runs in its own process group and the whole group is killed.
  const reap = () => { try { if (process.platform === 'win32') child.kill('SIGKILL'); else process.kill(-child.pid, 'SIGKILL'); } catch { try { child.kill('SIGKILL'); } catch { /* gone */ } } };
  const forgetReap = reapOnExit(reap);
  // a browser that never started (no such file) sends 'error', with no pid, and never 'exit'
  const exited = new Promise((resolve) => {
    const gone = () => { forgetReap(); resolve(); };
    child.once('exit', gone);
    child.once('error', () => { if (child.pid === undefined) gone(); });
  });
  const pending = new Map(), handlers = new Map();
  const failAll = (why) => { closed = true; for (const p of pending.values()) p.reject(new CdpError(why)); pending.clear(); };
  const conn = {
    ...extra,
    pid: child.pid,
    _reap: reap,
    _exited: exited,
    send(method, params = {}, sessionId, ms = 60_000) {
      if (closed) return Promise.reject(new CdpError(`${method}: the browser is gone${conn.stderrTail ? ` — ${conn.stderrTail()}` : ''}`));
      const n = ++id;
      return new Promise((resolve, reject) => {
        const timer = ms ? setTimeout(() => { pending.delete(n); reject(new CdpError(`${method} timed out after ${ms} ms`)); }, ms) : null;
        pending.set(n, { resolve: (v) => { clearTimeout(timer); resolve(v); }, reject: (e) => { clearTimeout(timer); reject(e); }, method });
        write(JSON.stringify({ id: n, method, params, ...(sessionId ? { sessionId } : {}) }));
      });
    },
    on(event, fn) { (handlers.get(event) || handlers.set(event, new Set()).get(event)).add(fn); return conn; },
    off(event, fn) { handlers.get(event)?.delete(fn); return conn; },
    once(event, fn) { const w = (...a) => { conn.off(event, w); fn(...a); }; return conn.on(event, w); },
    get closed() { return closed; },
  };
  conn._message = (text) => {
    let m;
    try { m = JSON.parse(text); } catch { return; }
    if (m.id != null) {
      const p = pending.get(m.id);
      if (!p) return;
      pending.delete(m.id);
      if (m.error) p.reject(new CdpError(`${p.method}: ${m.error.message}${m.error.data ? ` (${m.error.data})` : ''}`));
      else p.resolve(m.result || {});
    } else if (m.method) for (const fn of handlers.get(m.method) || []) fn(m.params || {}, m.sessionId);
  };
  conn._failAll = failAll;
  return conn;
}

function viaPipe(exe, flags) {
  const child = spawn(exe, [...flags, '--remote-debugging-pipe'], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
  const toChrome = child.stdio[3], fromChrome = child.stdio[4];
  let err = '';
  child.stderr.on('data', (b) => { err = (err + b).slice(-2000); });
  const conn = core(child, (s) => toChrome.write(s + '\0'), {
    transport: 'pipe',
    stderrTail: () => err.trim().split('\n').pop(),
    async close({ fast = false } = {}) {
      if (!conn.closed && !fast) { try { await conn.send('Browser.close', {}, undefined, 3000); } catch { /* already going */ } }
      conn._reap(); child.stderr.destroy(); toChrome.destroy(); fromChrome.destroy();
    },
  });
  let buf = '';
  fromChrome.setEncoding('utf8');
  fromChrome.on('data', (s) => {
    buf += s;
    let i;
    while ((i = buf.indexOf('\0')) >= 0) { const msg = buf.slice(0, i); buf = buf.slice(i + 1); if (msg) conn._message(msg); }
  });
  toChrome.on('error', () => {});
  child.on('exit', (code) => conn._failAll(`Chrome exited (${code})${err ? `: ${err.trim().split('\n').pop()}` : ''}`));
  child.on('error', (e) => conn._failAll(`could not start Chrome: ${e.message}`));
  return conn;
}

async function viaWebSocket(exe, flags, timeout) {
  const child = spawn(exe, [...flags, '--remote-debugging-port=0'], { stdio: ['ignore', 'ignore', 'pipe'], detached: process.platform !== 'win32' });
  const profile = flags.find((f) => f.startsWith('--user-data-dir=')).slice('--user-data-dir='.length);
  let err = '';
  child.stderr.on('data', (b) => { err = (err + b).slice(-2000); });
  // Chrome writes the port and browser path into <profile>/DevToolsActivePort — more robust than parsing stderr.
  const endpoint = await new Promise((resolve, reject) => {
    const file = join(profile, 'DevToolsActivePort');
    const t0 = Date.now();
    const timer = setInterval(() => {
      if (existsSync(file)) {
        const [port, path] = readFileSync(file, 'utf8').split('\n');
        if (port && path) { clearInterval(timer); resolve(`ws://127.0.0.1:${port}${path}`); }
      } else if (Date.now() - t0 > timeout) { clearInterval(timer); reject(new CdpError('Chrome did not open its debugging port')); }
    }, 50);
    child.on('exit', (code) => { clearInterval(timer); reject(new CdpError(`Chrome exited (${code}): ${err.trim().split('\n').pop()}`)); });
    child.on('error', (e) => { clearInterval(timer); reject(new CdpError(`could not start Chrome: ${e.message}`)); });
  });
  const ws = new WebSocket(endpoint);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new CdpError(`could not connect to ${endpoint}`)); });
  const conn = core(child, (s) => ws.send(s), {
    transport: 'websocket',
    stderrTail: () => err.trim().split('\n').pop(),
    async close() {
      if (!conn.closed) { try { await conn.send('Browser.close', {}, undefined, 3000); } catch { /* already going */ } }
      try { ws.close(); } catch { /* closed */ }
      conn._reap(); child.stderr.destroy();
    },
  });
  ws.onmessage = (e) => conn._message(String(e.data));
  ws.onclose = (e) => conn._failAll(`the browser closed the connection (code ${e.code}${e.reason ? ` ${e.reason}` : ''})`);
  child.on('exit', (code) => conn._failAll(`Chrome exited (${code})`));
  return conn;
}

// One page (tab) on a connection: send/evaluate scoped to its session.
export async function newPage(conn) {
  const { targetId } = await conn.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await conn.send('Target.attachToTarget', { targetId, flatten: true });
  const page = {
    targetId, sessionId,
    send: (method, params, ms) => conn.send(method, params, sessionId, ms),
    on: (event, fn) => conn.on(event, (p, sid) => { if (sid === sessionId) fn(p); }),
    // Evaluate an expression in the page; promises are awaited. Throws with the page's own message.
    async evaluate(expression, { ms = 60_000 } = {}) {
      const r = await conn.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId, ms);
      if (r.exceptionDetails) {
        const d = r.exceptionDetails;
        throw new CdpError(d.exception?.description?.split('\n')[0] || d.exception?.value || d.text || 'page evaluation failed');
      }
      return r.result?.value;
    },
    async close() { try { await conn.send('Target.closeTarget', { targetId }, undefined, 3000); } catch { /* gone */ } },
  };
  return page;
}
