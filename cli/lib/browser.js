// Finding a browser to drive: the Chrome the user already has; nothing is downloaded.
//   1. OM_CHROME (a path)
//   2. an installed Chrome / Chromium / Edge / Brave
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname } from 'node:path';

const APPS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge',
  '/snap/bin/chromium',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
];

// Windows also installs Chrome and Brave per user, without admin rights, under %LOCALAPPDATA%: a Chrome there comes before
// the Edge every Windows has (the one the installer just put there with winget, and the one it reports).
const userApps = (env) => (env.LOCALAPPDATA ? [
  `${env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
  `${env.LOCALAPPDATA}\\Chromium\\Application\\chrome.exe`,
  `${env.LOCALAPPDATA}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
] : []);
const defaultApps = (env) => {
  const edge = APPS.findIndex((p) => /Microsoft\\Edge\\Application/.test(p));
  return [...APPS.slice(0, edge), ...userApps(env).slice(0, 2), ...APPS.slice(edge), ...userApps(env).slice(2)];
};

// Where a browser would be looked for, in order, with what was found. `env` and `apps` are injectable for tests.
export function chromeCandidates({ env = process.env, apps = defaultApps(env) } = {}) {
  const list = [];
  if (env.OM_CHROME) list.push({ source: 'OM_CHROME', path: env.OM_CHROME });
  for (const p of apps) list.push({ source: 'installed', path: p });
  return list;
}

export function findChrome(opts) {
  return chromeCandidates(opts).find((c) => existsSync(c.path))?.path || null;
}

const byVersion = (a, b) => {
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < 4; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
};

// On Windows `chrome.exe --version` prints nothing: it opens a browser window with the user's profile and blocks until
// the timeout. Chrome, Edge and Brave keep each version in a folder named after it next to the exe
// (Application\156.0.8078.48\, two of them for a while after an update): the newest one is the version.
export function chromeVersion(exe, platform = process.platform) {
  if (platform === 'win32') {
    try { return readdirSync(dirname(exe)).filter((n) => /^\d+\.\d+\.\d+\.\d+$/.test(n)).sort(byVersion).at(-1) || null; } catch { return null; }
  }
  const r = spawnSync(exe, ['--version'], { encoding: 'utf8', timeout: 10_000 });
  return /(\d+\.\d+\.\d+\.\d+)/.exec(r.stdout || '')?.[1] || null;
}

export const NO_CHROME = 'no Chrome found — install Google Chrome (or Chromium / Edge), or set OM_CHROME to a browser executable';
