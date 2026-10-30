// Tests never write to the user's ~/.huashu-motion (experience, soundtracks): every run gets its own home.
// And every temp folder a test or the engine makes (projects, Chrome profiles, renders, installer sandboxes) goes under
// one folder per test process, removed when it ends: a run used to leave ~150 folders in the system's temp.
// (Removing follows no link: an installer test's junctions into this checkout are unlinked, never emptied.)
import { mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const RM = { recursive: true, force: true };
const system = tmpdir();
// On Windows a browser's helper processes keep files in the temp folder open for a moment after Chrome is killed:
// what cannot go when this process ends goes at a later run, once it is an hour old. One try each, no retries: every
// test process sweeps, and rm's retries on one folder still locked cost each of them seconds.
for (const name of readdirSync(system)) {
  if (!name.startsWith('srm-test-')) continue;
  try { if (Date.now() - statSync(join(system, name)).mtimeMs > 3_600_000) rmSync(join(system, name), RM); } catch { /* in use */ }
}
// this run's own folder: tried again for up to 2 s (the browsers were just killed), then left for a later run
const removeSoon = (dir) => {
  const end = Date.now() + 2000, nap = new Int32Array(new SharedArrayBuffer(4));
  for (;;) {
    try { rmSync(dir, RM); return; } catch { /* still locked */ }
    if (Date.now() >= end) return;
    Atomics.wait(nap, 0, 0, 100);
  }
};
const root = mkdtempSync(join(system, 'srm-test-'));
for (const k of ['TMPDIR', 'TMP', 'TEMP']) process.env[k] = root;
process.env.OM_HOME = mkdtempSync(join(root, 'om-home-'));
const cleanup = () => removeSoon(root);
// registered when the work is done, so it runs after the engine's own 'exit' handler has reaped any browser still open;
// a process.exit() before that (no beforeExit) cleans up at once
let scheduled = false;
process.once('beforeExit', () => { scheduled = true; process.once('exit', cleanup); });
process.once('exit', () => { if (!scheduled) cleanup(); });
