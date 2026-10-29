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
