import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findChrome } from '../cli/lib/browser.js';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CdpError, LOCAL_STATE, launch, newPage, removeLater } from '../cli/lib/cdp.js';

const skip = !findChrome() && 'no Chrome';

for (const transport of ['pipe', 'websocket']) {
  test(`cdp over ${transport}: evaluate, events, errors, two pages at once, close`, { skip }, async () => {
    const conn = await launch(findChrome(), { transport });
    try {
      assert.equal(conn.transport, transport);
      const a = await newPage(conn), b = await newPage(conn);
      await Promise.all([a.send('Runtime.enable'), b.send('Runtime.enable')]);
      const logs = [];
      a.on('Runtime.consoleAPICalled', (p) => logs.push(p.args[0].value));
      assert.equal(await a.evaluate('1 + 2'), 3);
      assert.equal(await b.evaluate('Promise.resolve("two")'), 'two'); // promises are awaited
      await a.evaluate('console.log("from a"), 0');
      await b.evaluate('console.log("from b"), 0');
      assert.deepEqual(logs, ['from a'], 'events reach only the page they belong to');
      await assert.rejects(() => a.evaluate('throw new Error("boom")'), /boom/);
      await assert.rejects(() => a.send('No.suchMethod'), CdpError);
      await assert.rejects(() => a.evaluate('new Promise(() => {})', { ms: 200 }), /timed out/);
      // a big message (a 1080p PNG is a few MB of base64) comes through whole
      assert.equal((await a.evaluate('"x".repeat(1 << 20)')).length, 1 << 20);
    } finally { await conn.close(); }
    await assert.rejects(() => conn.send('Browser.getVersion'), /gone|closed|exited/);
  });
}

// Without this cache Chrome on Windows signs in with an empty password on every fresh profile and can lock the account.
test('cdp: every profile starts with the blank-password answer cached, so Chrome never signs in to check', async () => {
  const conn = await launch('/no/such/chrome', { transport: 'pipe' });
  try {
    const state = JSON.parse(readFileSync(join(conn.profile, 'Local State'), 'utf8'));
    assert.deepEqual(state, LOCAL_STATE);
    // Chrome rechecks unless the cached last-changed time is at least now (microseconds since 1601), as a string
    const nowUs = (BigInt(Date.now()) + 11_644_473_600_000n) * 1000n;
    assert.equal(state.password_manager.os_password_blank, false);
    assert.ok(BigInt(state.password_manager.os_password_last_changed) > nowUs * 100n);
    assert.ok(BigInt(state.password_manager.os_password_last_changed) < 2n ** 63n);
  } finally { await conn.close(); }
});

test('cdp: a browser that cannot start is reported, not hung', async () => {
  await assert.rejects(() => launch('/no/such/chrome', { transport: 'pipe' }).then((c) => c.send('Browser.getVersion')), /Chrome|ENOENT|gone/);
});

// close() waits for the browser to exit before it removes the profile, but one that never started never exits
test('cdp: closing a browser that never started takes no wait, and removes its profile', async () => {
  const conn = await launch('/no/such/chrome', { transport: 'pipe' });
  const t0 = Date.now();
  await conn.close();
  assert.ok(Date.now() - t0 < 1000, `close took ${Date.now() - t0} ms`);
  assert.ok(!existsSync(conn.profile), `${conn.profile} is still there`);
});

test('removeLater: a folder that cannot go is given up after its deadline, not after rm\'s nested retries', { skip: process.platform === 'win32' && 'chmod does not lock a folder on Windows' }, async () => {
  const { chmodSync, mkdirSync, mkdtempSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const dir = mkdtempSync(join(tmpdir(), 'srm-locked-')), deep = join(dir, 'Default', 'GPUCache');
  mkdirSync(deep, { recursive: true });
  writeFileSync(join(deep, 'data_0'), 'x');
  chmodSync(deep, 0o500);   // its file cannot be removed: what a scanner holding it open does on Windows
  try {
    const t0 = Date.now();
    assert.equal(await removeLater(dir, 400), false);
    assert.ok(Date.now() - t0 < 2000, `gave up after ${Date.now() - t0} ms`);
  } finally { chmodSync(deep, 0o700); }
  assert.equal(await removeLater(dir, 400), true);
  assert.ok(!existsSync(dir));
});

test('Ctrl-C: every browser is killed before any profile is removed', { skip: process.platform === 'win32' && 'no SIGINT to send to oneself on Windows' }, async () => {
  const { spawnSync } = await import('node:child_process');
  const url = new URL('../cli/lib/cdp.js', import.meta.url).href;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', `
    const { cleanupOnInterrupt } = await import(${JSON.stringify(url)});
    for (const n of [1, 2]) { cleanupOnInterrupt(() => console.log('rm ' + n)); cleanupOnInterrupt(() => console.log('kill ' + n), { first: true }); }
    process.kill(process.pid, 'SIGINT'); setTimeout(() => {}, 2000);`], { encoding: 'utf8' });
  assert.deepEqual(r.stdout.trim().split('\n'), ['kill 1', 'kill 2', 'rm 1', 'rm 2']);
  assert.equal(r.status, 130);
});
