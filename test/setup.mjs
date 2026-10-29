// Tests never write to the user's ~/.huashu-motion (experience, soundtracks): every run gets its own home.
// And every temp folder a test or the engine makes (projects, Chrome profiles, renders, installer sandboxes) goes under
// one folder per test process, removed when it ends: a run used to leave ~150 folders in the system's temp.
// (Removing follows no link: an installer test's junctions into this checkout are unlinked, never emptied.)
import { mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const RM = { recursive: true, force: true, maxRetries: 5, retryDelay: 100 };
const system = tmpdir();
// A browser a test left running still holds its files when this process exits (Chrome is reaped by its own 'exit'
// handler, which runs after this one): what could not go then goes at the next run, once it is an hour old.
for (const name of readdirSync(system)) {
  if (!name.startsWith('srm-test-')) continue;
  try { if (Date.now() - statSync(join(system, name)).mtimeMs > 3_600_000) rmSync(join(system, name), RM); } catch { /* in use */ }
}
const root = mkdtempSync(join(system, 'srm-test-'));
for (const k of ['TMPDIR', 'TMP', 'TEMP']) process.env[k] = root;
process.env.OM_HOME = mkdtempSync(join(root, 'om-home-'));
process.on('exit', () => { try { rmSync(root, RM); } catch { /* the next run sweeps it */ } });
