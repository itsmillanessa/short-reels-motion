import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { powershellEnv } from '../cli/lib/voice.js';

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const win = process.platform === 'win32';

// `irm … | iex` reads install.ps1 as text: with a BOM, Windows PowerShell 5.1 takes the first line for a command and the
// param block for a cast, and the install dies on a null path; without a BOM, a file run with -File is read in the ANSI
// code page, so a single accent comes out garbled. ASCII without a BOM works every way.
test('install.ps1: ASCII only, no BOM', () => {
  const bytes = readFileSync(join(PKG, 'install.ps1'));
  assert.notDeepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'install.ps1 starts with a UTF-8 BOM');
  const line = bytes.toString('latin1').split('\n').findIndex((l) => /[^\x00-\x7f]/.test(l));
  assert.equal(line, -1, `install.ps1 line ${line + 1} is not ASCII`);
});

// The one-liner, the way a creator runs it, in a sandbox: this checkout (SRM_SRC), a throwaway home for the skill links
// and a throwaway npm prefix for the global command. Through iex nothing may stay behind in the session, and a failure
// must not close the window: a message and $LASTEXITCODE instead of `exit`.
// (the home has an AppData\Local: without one PowerShell writes its module cache under the current folder; and every
// PowerShell runs from the sandbox, never from this checkout; and it is a creator's PowerShell, with its own module
// path, not one that inherits PowerShell 7's, as every step on GitHub's runners would hand it)
const sandbox = () => {
  const root = mkdtempSync(join(tmpdir(), 'srm-install-'));
  for (const d of [['.codex'], ['AppData', 'Local'], ['AppData', 'Roaming']]) mkdirSync(join(root, 'home', ...d), { recursive: true });
  return { root, env: { ...powershellEnv(), USERPROFILE: join(root, 'home'), npm_config_prefix: join(root, 'npm') } };
};
const iex = ({ root, env }) => spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
  `Get-Content -Raw -Encoding UTF8 '${join(PKG, 'install.ps1')}' | iex; Write-Host ('AFTER eap=' + $ErrorActionPreference + ' vars=' + [bool](Get-Variable Yes, Dir -ErrorAction SilentlyContinue) + ' fns=' + [bool](Get-Command Say -ErrorAction SilentlyContinue) + ' code=' + $LASTEXITCODE)`],
{ encoding: 'utf8', env, cwd: root, timeout: 240_000 });

test('install.ps1 through iex: installs srm and links the skill, leaves the session as it was', { skip: !win && 'Windows only', timeout: 300_000 }, () => {
  const { root, env } = sandbox();
  const r = iex({ root, env: { ...env, SRM_SRC: PKG } });
  assert.match(r.stdout, /AFTER eap=Continue vars=False fns=False code=0/, r.stdout + r.stderr);
  assert.match(r.stdout, /\[ok\] srm instalado/);
  for (const agent of ['.claude', '.codex']) {
    const link = join(root, 'home', agent, 'skills', 'short-reels-motion');
    assert.ok(lstatSync(link).isSymbolicLink(), `${link} is a junction`);
    assert.ok(existsSync(join(link, 'SKILL.md')));
  }
  assert.ok(existsSync(join(root, 'npm', 'srm.cmd')), 'srm.cmd in the npm prefix');
  assert.ok(!existsSync(join(PKG, 'Microsoft')), 'nothing written into the checkout');
});

test('install.ps1 through iex: a failure prints why and keeps the window open', { skip: !win && 'Windows only', timeout: 120_000 }, () => {
  const { root, env } = sandbox();
  const r = iex({ root, env: { ...env, SRM_SRC: join(tmpdir(), 'no-such-short-reels-motion') } });
  assert.match(r.stdout, /No se pudo terminar la instalacion: SRM_SRC no parece Short Reels Motion/);
  assert.match(r.stdout, /AFTER eap=Continue vars=False fns=False code=1/, r.stdout + r.stderr);
});

test('install.ps1 run as a file: a failure is the exit code', { skip: !win && 'Windows only', timeout: 120_000 }, () => {
  const { root, env } = sandbox();
  const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', join(PKG, 'install.ps1'), '-NoGlobal', '-NoSkill'],
    { encoding: 'utf8', env: { ...env, SRM_SRC: join(tmpdir(), 'no-such-short-reels-motion') }, cwd: root, timeout: 120_000 });
  assert.equal(r.status, 1, r.stdout + r.stderr);
});
