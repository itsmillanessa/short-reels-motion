import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome } from '../cli/lib/browser.js';
import { checkPage, checkSource } from '../cli/lib/check.js';

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fresh = (template) => {
  const root = join(mkdtempSync(join(tmpdir(), 'srm-tpl-')), template);
  const r = spawnSync(process.execPath, [join(PKG, 'cli/om.js'), 'new', root, '--template', template], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return { root, index: join(root, 'index.html'), om: join(root, '.om') };
};

test('short-pantalla: a new project carries the motion library and the sample recording, and its source is clean', () => {
  const project = fresh('short-pantalla');
  for (const f of ['vendor/srm.js', 'vendor/om.js', 'vendor/gsap.min.js', 'assets/pantalla.mp4', 'assets/fonts/Inter-var.woff']) assert.ok(existsSync(join(project.root, f)), f);
  assert.deepEqual(checkSource(project).filter((f) => f.level === 'error'), []);
});

// every vertical template (short-*): it starts clean and keeps its text out from under the feeds' interface
const SHORTS = readdirSync(join(PKG, 'templates')).filter((t) => t.startsWith('short-'));
test('short templates are found', () => assert.ok(SHORTS.length >= 2, SHORTS.join(',')));
for (const t of SHORTS) {
  test(`${t}: clean source, no page errors, no text under TikTok / Reels / Shorts interface`, { skip: !findChrome() && 'no Chrome' }, async () => {
    const project = fresh(t);
    assert.deepEqual(checkSource(project).filter((f) => f.level === 'error'), []);
    const found = await checkPage(project, { samples: 12 });
    assert.deepEqual(found.filter((f) => f.level === 'error'), [], JSON.stringify(found));
    assert.deepEqual(found.filter((f) => f.code === 'unsafe-zone'), [], JSON.stringify(found));
  });
}

test('SRM.typeOn: frame 0 is the HTML text (the poster) however it is reached, and typings on one node follow each other', { skip: !findChrome() && 'no Chrome' }, async () => {
  const { copyFileSync, mkdirSync, writeFileSync } = await import('node:fs');
  const { openFilm } = await import('../cli/lib/capture.js');
  const dir = mkdtempSync(join(tmpdir(), 'srm-type-'));
  mkdirSync(join(dir, 'vendor'));
  copyFileSync(join(PKG, 'templates/blank/vendor/gsap.min.js'), join(dir, 'vendor/gsap.min.js'));
  copyFileSync(join(PKG, 'runtime/om.js'), join(dir, 'vendor/om.js'));
  copyFileSync(join(PKG, 'runtime/srm-motion.js'), join(dir, 'vendor/srm.js'));
  // a chat box: "hola mundo" types 1–2 s, then "adios" replaces it 2.5–2.8 s
  writeFileSync(join(dir, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><script src="vendor/gsap.min.js"></script><script src="vendor/om.js"></script><script src="vendor/srm.js"></script></head>
<body style="margin:0"><div id="film" data-composition-id="film" data-width="320" data-height="568"><p id="t">hola mundo</p></div>
<script>const tl = gsap.timeline({ paused: true }); SRM.typeOn(tl, '#t', 'hola mundo', 1, 2); SRM.typeOn(tl, '#t', 'adios', 2.5, 2.8); tl.to({}, { duration: 3.5 }, 0); window.__timelines = { film: tl };</script></body></html>`);
  const want = { 0: 'hola mundo', 0.5: '', 1.5: 'hola ', 2.2: 'hola mundo', 2.6: 'ad', 3.2: 'adios' };
  for (const order of [[0, 0.5, 1.5, 2.2, 2.6, 3.2], [3.2, 2.6, 2.2, 1.5, 0.5, 0], [2.2, 0]]) {
    const film = await openFilm(join(dir, 'index.html'), { video: 'seek' });
    try {
      for (const t of order) { await film.seek(t); assert.equal(await film.evaluate(`document.getElementById('t').textContent`), want[t], `at ${t}s, reached by ${order.join('→')}`); }
    } finally { await film.close(); }
  }
});
