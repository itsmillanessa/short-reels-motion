import { test } from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome } from '../cli/lib/browser.js';
import { check, checkPage, checkSource } from '../cli/lib/check.js';
import { makeFilm } from './fixture-film.js';

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const codes = (found, level) => found.filter((f) => !level || f.level === level).map((f) => f.code);
// the narration's words as om voice writes them: "chat" is said twice (once capitalised), "hola" once
const CUES = '<script type="application/json" id="om-cues">{"words":[{"word":"Chat","start":0.4,"end":0.6},{"word":"el","start":0.9,"end":1},{"word":"chat,","start":1.1,"end":1.4},{"word":"hola","start":1.5,"end":1.7}]}</script>';
// a film that loads the runtime (OM.sfx, OM.cue) from its vendor folder, as om new leaves it
const withRuntime = (opts) => {
  const f = makeFilm({ sound: false, video: false, ...opts, body: '<script src="vendor/om.js"></script>' + (opts.body || '') });
  mkdirSync(join(f.dir, 'vendor'), { recursive: true });
  copyFileSync(join(PKG, 'runtime', 'om.js'), join(f.dir, 'vendor', 'om.js'));
  return f;
};

test('check (source): a clean film has no errors, and the om-score is not read as JavaScript', () => {
  const { project } = makeFilm({ sound: false });
  assert.deepEqual(codes(checkSource(project), 'error'), []);
});

test('check (source): the mistakes that break a render are errors, clock and random use are warnings', () => {
  const { project, index } = makeFilm({
    sound: false,
    body: '<img src="assets/nope.png"><b data-var-text="ghost">x</b><i id="twice"></i><i id="twice"></i>',
    script: 'gsap.to("#box", { left: 200, duration: 1 }); const r = Math.random(); const d = Date.now();',
  });
  writeFileSync(join(index, '..', 'draft.html'), '<div data-composition-id="draft" data-width="10" data-height="10"></div>');
  const found = checkSource(project);
  for (const c of ['missing-file', 'unknown-variable', 'duplicate-id', 'layout-motion', 'several-compositions']) assert.ok(codes(found, 'error').includes(c), `${c} in ${JSON.stringify(found)}`);
  for (const c of ['random', 'clock']) assert.ok(codes(found, 'warning').includes(c), c);
  assert.ok(found.find((f) => f.code === 'layout-motion').line > 1, 'points at the line');
});

test('check (source): a script that does not parse is an error with its line', () => {
  const { project } = makeFilm({ sound: false, script: 'const a = ;' });
  const f = checkSource(project).find((x) => x.code === 'script-syntax');
  assert.ok(f && f.line > 10, JSON.stringify(f));
});

test('check (page): frames that depend on what was played before are found; a clean film passes', { skip: !findChrome() && 'no Chrome' }, async () => {
  const clean = makeFilm({ sound: false, video: false });
  assert.deepEqual(codes(await checkPage(clean.project, { samples: 6 }), 'error'), []);
  // the box only moves after the timeline has been played through 0.3 s: jumping straight to a later time misses that
  const { project } = makeFilm({ sound: false, video: false, script: 'let armed = false; const real = window.__timelines.film.seek; window.__timelines.film.seek = (t) => { if (t > 0.2 && t < 0.4) armed = true; real(armed ? t : 0); };' });
  const found = await checkPage(project, { samples: 30 });
  assert.ok(codes(found).includes('history-dependent'), JSON.stringify(found));
});

test('check (source): Array.from with an arrow that returns layout, and a file name with a literal %, are not errors', () => {
  const { project } = makeFilm({ sound: false, body: '<div style="background:url(assets/100%.png)"></div>', script: 'const rows = Array.from({ length: 3 }, (_, i) => ({ top: i * 10, height: 8 }));' });
  writeFileSync(join(project.root, 'assets', '100%.png'), '');
  assert.deepEqual(codes(checkSource(project), 'error'), []);
});

test('om check --source: a film that draws the product instead of showing it is warned about', async () => {
  const { checkSource } = await import('../cli/lib/check.js');
  const { mkdtempSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const film = (body) => { const root = mkdtempSync(join(tmpdir(), 'om-real-')); writeFileSync(join(root, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"></head><body><div data-composition-id="f" data-width="320" data-height="180">${body}</div><script>window.__timelines={f:{seek(){},pause(){},duration(){return 2}}}</script></body></html>`); return { root, index: join(root, 'index.html'), om: join(root, '.om') }; };
  const codes = (body) => checkSource(film(body)).map((f) => f.code);
  assert.ok(codes('<div class="ui"></div>').includes('no-real-material'));
  assert.ok(codes('<img src="assets/icon128.png">').includes('only-logo'));
  assert.ok(codes('<img src="https://placehold.co/600x400"><img src="assets/shot.png">').includes('placeholder'));
  const real = codes('<img src="materials/web-site/screen-01.png">');
  assert.ok(!real.includes('no-real-material') && !real.includes('only-logo'));
  assert.ok(real.includes('no-materials-list'));
});

test('check (page): whitespace between tags does not judge a parent by its hidden children', { skip: !findChrome() && 'no Chrome' }, async () => {
  // a title block whose lines are hidden (they fade in later) and would run off the frame: nothing to warn about yet
  const { project } = makeFilm({ sound: false, video: false, body: '<div id="end">\n  <h1 style="position:absolute;left:200px;top:120px;margin:0;font-size:30px;white-space:nowrap;opacity:0">a long closing title</h1>\n  <p style="position:absolute;left:200px;top:150px;margin:0;opacity:0">and a subtitle</p>\n</div>' });
  const found = await checkPage(project, { samples: 4 });
  assert.deepEqual(found.filter((f) => /^text-|low-contrast/.test(f.code)), [], JSON.stringify(found));
});

test('check (source): a sound effect the library does not have is an error with the nearest name; one in a comment is not a call', () => {
  const { project } = makeFilm({ sound: false, script: "OM.sfx('swoosh', 0.5); OM.sfx(\"whoosh\", 1);\n// OM.sfx('boing2', 1)\n/* OM.sfx('nope', 1) */" });
  const f = checkSource(project).filter((x) => x.code === 'unknown-sfx');
  assert.equal(f.length, 1, JSON.stringify(f));
  assert.equal(f[0].level, 'error');
  assert.match(f[0].message, /'swoosh'.*did you mean 'whoosh'/);
  assert.ok(f[0].line > 10, 'points at the line');
});

test('check (source): an anchor to a word said twice that names no occurrence is a warning; a numbered one, or a word said once, is not', () => {
  const { project } = makeFilm({ sound: false, body: CUES, script: "const a = OM.cue('chat'); const b = SRM.cue('chat', 2); const c = OM.cue('hola'); const n = 2; const d = OM.cue('chat', n); const e = OM.cue('CHAT');\n// OM.cue('el')" });
  const f = checkSource(project).filter((x) => x.code === 'cue-repeated');
  assert.equal(f.length, 1, JSON.stringify(f));
  assert.equal(f[0].level, 'warning');
  assert.match(f[0].message, /"chat" is said 2 times \(0\.40s, 1\.10s\).*cue\('chat', 2\)/);
  // without narration there is nothing to compare with
  assert.deepEqual(codes(checkSource(makeFilm({ sound: false, script: "const a = OM.cue('chat');" }).project)).filter((c) => c === 'cue-repeated'), []);
});

test('check: effects and anchors asked for through a helper are found in the page; a literal one is reported once, with its line', { skip: !findChrome() && 'no Chrome' }, async () => {
  const { project } = withRuntime({ body: CUES, script: "const W = (w) => OM.cue(w); const S = (n, t) => OM.sfx(n, t); W('chat'); S('swoosh', 0.5); OM.sfx('clik', 1); OM.cue('chat', 2); OM.cue('hola');" });
  const found = await check(project, { samples: 2 });
  const sfx = found.filter((f) => f.code === 'unknown-sfx'), cue = found.filter((f) => f.code === 'cue-repeated');
  assert.deepEqual(sfx.map((f) => f.sfx).sort(), ['clik', 'swoosh'], JSON.stringify(sfx));
  assert.ok(sfx.find((f) => f.sfx === 'clik').line, 'the literal one keeps the line from the source');
  assert.match(sfx.find((f) => f.sfx === 'swoosh').message, /did you mean 'whoosh'/);
  assert.equal(cue.length, 1, JSON.stringify(cue));
  assert.equal(cue[0].cue, 'chat');
  assert.ok(sfx.every((f) => f.level === 'error') && cue[0].level === 'warning');
});
