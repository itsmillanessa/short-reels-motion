import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findChrome } from '../cli/lib/browser.js';
import { checkPage } from '../cli/lib/check.js';
import { PLATFORMS, isVertical, platformsOf, unionZones, unsafeText, zonesFor } from '../cli/lib/safezones.js';

const box = (name, x, y, w, h, safe = true) => ({ name, text: name, x, y, w, h, safe });

test('safe zones: only vertical frames are judged, and the bands scale with the frame', () => {
  assert.equal(isVertical(1080, 1920), true);
  assert.equal(isVertical(1920, 1080), false);
  assert.equal(isVertical(1080, 1350), false); // 4:5 is a feed post, not a full-screen short
  const big = zonesFor('tiktok', 1080, 1920), small = zonesFor('tiktok', 540, 960);
  const bottom = (z) => z.find((b) => b.side === 'bottom');
  assert.equal(bottom(big).h, PLATFORMS.tiktok.bottom);
  assert.equal(bottom(small).h, PLATFORMS.tiktok.bottom / 2);
});

test('safe zones: data-platforms narrows the feeds, an unknown one is an error', () => {
  assert.deepEqual(platformsOf(null), ['tiktok', 'reels', 'shorts']);
  assert.deepEqual(platformsOf('TikTok, reels'), ['tiktok', 'reels']);
  assert.throws(() => platformsOf('tiktok,snapchat'), /unknown snapchat/);
});

test('safe zones: the union keeps the widest band of each side', () => {
  const u = unionZones(['tiktok', 'reels', 'shorts'], 1080, 1920);
  const side = (s) => u.find((z) => z.side === s);
  assert.equal(side('top').h, Math.max(...Object.values(PLATFORMS).map((p) => p.top)));
  assert.equal(side('bottom').h, Math.max(...Object.values(PLATFORMS).map((p) => p.bottom)));
  assert.equal(side('right').y, Math.min(...Object.values(PLATFORMS).map((p) => p.rightFrom)));
});

test('safe zones: text under the caption, the buttons or the top bar is found; centred or waived text is not', () => {
  const all = platformsOf(null);
  const found = unsafeText([
    box('[title]', 100, 800, 700, 160),          // the middle of the frame
    box('[cta]', 100, 1700, 600, 90),            // the caption and sound row
    box('[count]', 960, 1100, 100, 60),          // the like and share buttons
    box('[kicker]', 300, 60, 400, 50),           // the tabs on top
    box('[credit]', 100, 1800, 300, 40, false),  // waived with data-layout-allow-safe-zone
    box('[edge]', 100, 1480, 600, 35),           // above Reels' band (from 1520) but inside TikTok's (from 1500)
  ], all, 1080, 1920);
  const by = Object.fromEntries(found.map((f) => [f.message.split(' ')[0], f]));
  assert.deepEqual(Object.keys(by).sort(), ['[count]', '[cta]', '[edge]', '[kicker]']);
  assert.deepEqual(by['[cta]'].sides, ['bottom']);
  assert.deepEqual(by['[count]'].sides, ['right']);
  assert.deepEqual(by['[edge]'].platforms, ['tiktok'], 'only the feed whose band it is in');
  assert.match(by['[cta]'].message, /TikTok, Reels, Shorts/);
  assert.deepEqual(unsafeText([box('[edge]', 100, 1480, 600, 35)], ['reels', 'shorts'], 1080, 1920), [], 'not a finding when TikTok is not a target');
});

const film = (body, attrs = '') => {
  const dir = mkdtempSync(join(tmpdir(), 'srm-safe-'));
  writeFileSync(join(dir, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;background:#000}#film{position:relative;width:270px;height:480px;overflow:hidden;background:#111;color:#fff;font:bold 16px sans-serif}
p{position:absolute;margin:0;white-space:nowrap}</style></head><body>
<div id="film" data-composition-id="film" data-width="270" data-height="480" ${attrs}>${body}</div>
<script>window.__timelines = { film: { seek() {}, pause() {}, duration() { return 1; }, labels: {} } };</script>
</body></html>`);
  return { root: dir, index: join(dir, 'index.html'), om: join(dir, '.om') };
};

test('check (page): a vertical film warns about text under the feeds\' interface', { skip: !findChrome() && 'no Chrome' }, async () => {
  const project = film(`<p data-om-id="title" style="left:40px;top:200px">Treinta segundos</p>
<p data-om-id="cta" style="left:40px;top:440px">Sígueme para más</p>
<p data-om-id="ok" data-layout-allow-safe-zone style="left:40px;top:455px">@handle</p>`);
  const found = (await checkPage(project, { samples: 2 })).filter((f) => f.code === 'unsafe-zone');
  assert.equal(found.length, 1, JSON.stringify(found));
  assert.match(found[0].message, /^\[cta\] "Sígueme para más" sits under the caption/);
  const wrong = await checkPage(film('<p style="left:40px;top:200px">hola mundo</p>', 'data-platforms="snapchat"'), { samples: 2 });
  assert.ok(wrong.some((f) => f.code === 'platforms' && f.level === 'error'), JSON.stringify(wrong));
});

test('check (page): a 16:9 film is not judged against the feeds', { skip: !findChrome() && 'no Chrome' }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'srm-wide-'));
  writeFileSync(join(dir, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0}#film{position:relative;width:480px;height:270px;background:#111;color:#fff;font:bold 16px sans-serif}p{position:absolute;margin:0}</style></head><body>
<div id="film" data-composition-id="film" data-width="480" data-height="270"><p style="left:40px;top:240px">bottom line</p></div>
<script>window.__timelines = { film: { seek() {}, pause() {}, duration() { return 1; }, labels: {} } };</script></body></html>`);
  const found = await checkPage({ root: dir, index: join(dir, 'index.html'), om: join(dir, '.om') }, { samples: 2 });
  assert.equal(found.filter((f) => f.code === 'unsafe-zone').length, 0);
});

test('check (page): text clipped inside a phone screen is judged on what shows; text scrolled out of it is not judged', { skip: !findChrome() && 'no Chrome' }, async () => {
  // the screen ends at 330 px; the long message runs on past it, behind the keyboard and into the feeds' bottom band
  const long = 'un mensaje largo que sigue y sigue hacia abajo, debajo de la pantalla del celular, con más palabras y más palabras, y todavía más palabras que ya nadie ve porque la pantalla las corta, y más, y más';
  const project = film(`<div id="screen" style="position:absolute;left:30px;top:40px;width:210px;height:290px;overflow:hidden;background:#222">
<p data-om-id="long" style="left:10px;top:230px;width:190px;white-space:normal;line-height:1.3">${long}</p>
<p data-om-id="gone" style="left:10px;top:330px">ya no se ve</p></div>
<div id="keys" style="position:absolute;left:0;top:345px;width:270px;height:135px;background:#555"></div>`);
  const found = await checkPage(project, { samples: 2 });
  const of = (id) => found.filter((f) => f.message.includes('[' + id + ']')).map((f) => f.code);
  assert.deepEqual(of('gone'), [], 'a text clipped away completely is not on screen: ' + JSON.stringify(found));
  assert.deepEqual([...new Set(of('long'))], ['text-clipped'], 'only that the screen cuts it, not covered or unsafe: ' + JSON.stringify(found));
});
