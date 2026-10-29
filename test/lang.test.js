import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cliLang, tr } from '../cli/lib/lang.js';

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const none = () => null;

test('cli language: SRM_LANG, then OM_LANG, then the kit, then the system; Spanish or English', () => {
  assert.equal(cliLang({ env: { SRM_LANG: 'es' }, kit: () => 'en-US', system: () => 'en-US' }), 'es');
  assert.equal(cliLang({ env: { SRM_LANG: 'en', OM_LANG: 'es' }, kit: none, system: none }), 'en');
  assert.equal(cliLang({ env: { OM_LANG: 'es-MX' }, kit: none, system: none }), 'es');
  assert.equal(cliLang({ env: { OM_LANG: 'zh' }, kit: () => 'es-MX', system: none }), 'en', 'the studio speaks Chinese, the CLI does not');
  assert.equal(cliLang({ env: {}, kit: () => 'es-MX', system: () => 'en-US' }), 'es');
  assert.equal(cliLang({ env: {}, kit: none, system: () => 'es-ES' }), 'es');
  assert.equal(cliLang({ env: {}, kit: none, system: () => 'de-DE' }), 'en');
  assert.equal(cliLang({ env: {}, kit: none, system: none }), 'en');
  assert.equal(tr({ es: 'hola', en: 'hello' }, 'es'), 'hola');
  assert.equal(tr({ es: 'hola', en: 'hello' }, 'fr'), 'hello');
});

const srm = (args, lang) => spawnSync(process.execPath, [join(PKG, 'cli/om.js'), ...args], { encoding: 'utf8', env: { ...process.env, SRM_LANG: lang } });

test('srm help in Spanish and in English, with the same commands', () => {
  const es = srm(['help'], 'es').stdout, en = srm(['help'], 'en').stdout;
  assert.match(es, /srm new <dir> \[--template t\] {3}empezar un proyecto/);
  assert.match(en, /srm new <dir> \[--template t\] {3}start a project/);
  const commands = (s) => s.split('\n').filter((l) => l.startsWith('  srm ')).map((l) => l.trim().split(/\s+/)[1]);
  assert.deepEqual(commands(es), commands(en));
  assert.ok(!/[一-鿿]/.test(es + en), 'no Chinese examples left in the help');
  assert.match(es, /srm voice --setup/);
});

test('srm templates: the summary column clears the longest name', () => {
  const lines = srm(['templates'], 'es').stdout.split('\n');
  const names = lines.filter((l) => /^\S/.test(l)), notes = lines.filter((l) => /^\s+sirve para: /.test(l));
  assert.ok(names.length > 5 && notes.length > 5, lines.slice(0, 4).join('\n'));
  const longest = Math.max(...names.map((l) => l.indexOf(' ')));
  const summaryAt = (l) => l.indexOf(' ') + l.slice(l.indexOf(' ')).search(/\S/);
  assert.deepEqual([...new Set(names.map(summaryAt))], [longest + 2], 'every summary starts in the same column, past the longest name');
});
