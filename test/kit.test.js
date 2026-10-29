import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyKit, importKit, readKit, setKit } from '../cli/lib/kit.js';
import { readVariables } from '../cli/lib/project.js';

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = () => join(mkdtempSync(join(tmpdir(), 'srm-kit-')), 'kit.json');
const value = (html, id) => readVariables(html).find((v) => v.id === id)?.default;

test('kit: values are checked and kept; a handle gets its @, an empty value removes a key', () => {
  const file = tmp();
  assert.deepEqual(readKit(file), {});
  setKit({ handle: 'itsmillan.ai', accent: '#E4007C', speed: '1.2', cover: 'sí', 'character.hair': 'curly' }, file);
  assert.deepEqual(readKit(file), { handle: '@itsmillan.ai', accent: '#E4007C', speed: 1.2, cover: true, character: { hair: 'curly' } });
  assert.throws(() => setKit({ accent: 'rosa' }, file), /not a colour/);
  assert.throws(() => setKit({ favorite: 'x' }, file), /unknown kit key/);
  assert.throws(() => setKit({ 'character.wings': 'yes' }, file), /unknown character field/);
  setKit({ speed: '' }, file);
  assert.equal(readKit(file).speed, undefined);
});

test('kit: import takes a creator kit file (notes in _keys are skipped, the character is nested)', () => {
  const file = tmp(), src = join(dirname(file), 'mio.json');
  writeFileSync(src, JSON.stringify({ _nota: 'para personas', handle: '@yo', ground: '#0E0E10', character: { skin: '#E6BC98', hair: 'curly' } }));
  assert.deepEqual(importKit(src, file), { handle: '@yo', ground: '#0E0E10', character: { skin: '#E6BC98', hair: 'curly' } });
});

test('kit: applied to a template, only what it declares; language and platforms on the page; bad options skipped', () => {
  const lista = readFileSync(join(PKG, 'templates/short-lista/index.html'), 'utf8');
  const r = applyKit(lista, { handle: '@yo', accent: '#E4007C', cta: 'GUÁRDALO', lang: 'en', platforms: 'tiktok', speed: 1.2, character: { hair: 'curly' } });
  assert.equal(value(r.html, 'handle'), '@yo');
  assert.equal(value(r.html, 'accent'), '#E4007C');
  assert.equal(value(r.html, 'cta'), 'GUÁRDALO');
  assert.match(r.html, /<html lang="en"/);
  assert.match(r.html, /data-platforms="tiktok"/);
  assert.deepEqual(r.applied.sort(), ['accent', 'cta', 'handle', 'lang', 'platforms']);
  const story = readFileSync(join(PKG, 'templates/storytime/index.html'), 'utf8');
  const s = applyKit(story, { character: { skin: '#E6BC98', hair: 'curly', footwear: 'boots', accessory: 'monocle' } });
  assert.equal(value(s.html, 'skin'), '#E6BC98');
  assert.equal(value(s.html, 'hair'), 'curly');
  assert.equal(value(s.html, 'footwear'), 'boots');
  assert.ok(s.skipped.some((x) => x.startsWith('accessory')), 'an option the template does not offer is skipped, not a failed project');
});

test('kit: srm new starts the project with the kit; --no-kit leaves the template as it is', () => {
  const file = tmp();
  setKit({ handle: '@itsmillan.ai', accent: '#E4007C' }, file);
  const make = (...extra) => {
    const dir = join(mkdtempSync(join(tmpdir(), 'srm-kitnew-')), 'p');
    const r = spawnSync(process.execPath, [join(PKG, 'cli/om.js'), 'new', dir, '--template', 'short-pantalla', ...extra], { encoding: 'utf8', env: { ...process.env, SRM_KIT: file } });
    assert.equal(r.status, 0, r.stderr);
    return { html: readFileSync(join(dir, 'index.html'), 'utf8'), out: r.stdout };
  };
  const a = make();
  assert.equal(value(a.html, 'handle'), '@itsmillan.ai');
  assert.equal(value(a.html, 'accent'), '#E4007C');
  assert.match(a.out, /kit\s+handle, accent/);
  assert.equal(value(make('--no-kit').html, 'handle'), '@tu_usuario');
});
