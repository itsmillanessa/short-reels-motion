// Runtime helpers (springs, seeded random) and `om qa` on synthetic videos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { qa, heldApart, holdsOf } from '../cli/lib/qa.js';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { findChrome } from '../cli/lib/browser.js';

globalThis.window = {};
globalThis.document = { querySelector: () => null };
createRequire(import.meta.url)('../runtime/om.js');
const OM = window.OM;

test('OM.spring starts at 0, ends exactly at 1, and overshoots by about the bounce', () => {
  for (const b of [0, 0.05, 0.1, 0.25]) {
    const e = OM.spring(b);
    assert.equal(e(0), 0);
    assert.equal(e(1), 1);
    let peak = 0;
    for (let p = 0; p <= 1; p += 0.001) peak = Math.max(peak, e(p));
    assert.ok(Math.abs(peak - 1 - b) < 0.01, `bounce ${b}: peak ${peak}`);
    assert.ok(Math.abs(e(0.98) - 1) < 0.01, 'settled near the end');
  }
});

test('OM.springValue is a pure function of time that follows every target', () => {
  const ch = [{ at: 1, to: 100 }, { at: 2, to: 40 }];
  assert.equal(OM.springValue(0, ch, 0.5), 0);
  assert.ok(Math.abs(OM.springValue(0, ch, 1.9, { settle: 0.5 }) - 100) < 1);
  assert.ok(Math.abs(OM.springValue(0, ch, 3, { settle: 0.5 }) - 40) < 0.5);
  assert.equal(OM.springValue(0, ch, 1.4), OM.springValue(0, ch, 1.4));
});

test('OM.random is deterministic per seed', () => {
  const a = OM.random(7), b = OM.random(7), c = OM.random(8);
  const xa = [a(), a(), a()], xb = [b(), b(), b()];
  assert.deepEqual(xa, xb);
  assert.notDeepEqual(xa, [c(), c(), c()]);
  assert.ok(xa.every((x) => x >= 0 && x < 1));
});

test('OM.env: the loudness srm voice measured, at film time (after data-start); null without a narration. OM.hold records holds', () => {
  document.getElementById = () => null;
  assert.equal(OM.env(1), null, 'no om-cues: no envelope');
  const cues = { offset: 1, duration: 0.3, env: { fps: 10, a: '0z8' }, words: [] };
  document.getElementById = (id) => (id === 'om-cues' ? { textContent: JSON.stringify(cues) } : null);
  assert.equal(OM.env(1.0), 0);
  assert.equal(OM.env(1.1), 1);
  assert.equal(OM.env(1.2), 8 / 35);
  assert.equal(OM.env(0.5), 0, 'before the narration starts');
  assert.equal(OM.env(9), 0, 'after it ends');
  assert.equal(OM.hold(2, 3.5), 2);
  OM.hold(2, 3.5); OM.hold(0.5, 1);
  assert.deepEqual(window.__om.holds(), [{ from: 0.5, to: 1 }, { from: 2, to: 3.5 }], 'sorted, one entry per hold however often it is called');
  assert.throws(() => OM.hold(3, 2), /from < to/);
});

test('heldApart: a hold covers the still stretch it marks (with 0.25 s of settle), what it leaves of ≥ 1 s stays dead', () => {
  const still = [{ from: 2, to: 4.5, seconds: 2.5 }, { from: 6, to: 7.2, seconds: 1.2 }];
  assert.deepEqual(heldApart(still, []), { dead: still, held: [] });
  const r = heldApart(still, [{ from: 2.2, to: 4.4 }]);
  assert.deepEqual(r.held, [still[0]]);
  assert.deepEqual(r.dead, [still[1]]);
  // a hold that covers only the start of a long stretch leaves the rest dead
  assert.deepEqual(heldApart([{ from: 1, to: 5, seconds: 4 }], [{ from: 1, to: 2 }]).dead, [{ from: 2.25, to: 5, seconds: 2.75 }]);
});

const ff = (args) => assert.equal(spawnSync('ffmpeg', ['-v', 'error', '-y', ...args]).status, 0);
const has = spawnSync('ffmpeg', ['-version']).status === 0;

test('om qa finds a single-frame pop, a hard cut and dead time', { skip: !has && 'no ffmpeg' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'om-qa-'));
  // a moving bar, 1 frame of white at 1.0 s, a cut to a different scene at 2 s, then 1.5 s frozen.
  ff(['-f', 'lavfi', '-i', 'color=c=black:s=320x180:r=30:d=4.5', '-f', 'lavfi', '-i', 'color=c=white:s=40x60:r=30:d=4.5', '-filter_complex',
    "[0][1]overlay=x='mod(t*120,320)':y=60:eval=frame:enable='lt(t,2)',drawbox=x=0:y=0:w=320:h=180:c=white:t=fill:enable='between(n,30,30)',drawbox=x=40:y=20:w=240:h=140:c=red:t=fill:enable='gte(t,2)'",
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', join(dir, 'a.mp4')]);
  const r = qa(join(dir, 'a.mp4'));
  assert.ok(r.pops.some((p) => Math.abs(p.at - 1) < 0.05), JSON.stringify(r.pops));
  assert.ok(r.cuts.some((c) => Math.abs(c - 2) < 0.05), JSON.stringify(r.cuts));
  assert.ok(r.dead.some((d) => d.from >= 1.9 && d.seconds >= 2), JSON.stringify(r.dead));
  // the same still stretch marked as a hold: reported as held, not as dead time
  const held = qa(join(dir, 'a.mp4'), { holds: [{ from: 2, to: 4.5 }] });
  assert.deepEqual(held.dead, []);
  assert.ok(held.held.some((d) => d.from >= 1.9), JSON.stringify(held.held));
});

test('holdsOf reads the film\'s OM.hold calls from its page (times of the narration included)', { skip: !findChrome() && 'no Chrome' }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'om-holds-'));
  mkdirSync(join(dir, 'vendor'));
  copyFileSync(new URL('../runtime/om.js', import.meta.url), join(dir, 'vendor', 'om.js'));
  writeFileSync(join(dir, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><script type="application/json" id="om-cues">{"words":[{"word":"lee","start":1.5,"end":1.8}]}</script><script src="vendor/om.js"></script></head>
<body style="margin:0"><div id="f" data-composition-id="f" data-width="320" data-height="180"></div>
<script>window.__timelines = { f: { seek() {}, pause() {}, duration() { return 4; } } }; OM.hold(OM.cue('lee'), OM.cue('lee') + 2);</script></body></html>`);
  const project = { root: dir, index: join(dir, 'index.html'), om: join(dir, '.om') };
  assert.deepEqual((await holdsOf(project, join(dir, 'out', 'f-v1.mp4'))).holds, [{ from: 1.5, to: 3.5 }]);
  writeFileSync(join(dir, 'index.html'), '<!doctype html><html><body><div data-composition-id="f" data-width="320" data-height="180"></div></body></html>');
  assert.deepEqual(await holdsOf(project, join(dir, 'x.mp4')), { holds: [] }, 'no OM.hold: the page is not opened');
});

test('om qa loop check: a cycle matches, a one-way move does not', { skip: !has && 'no ffmpeg' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'om-qa-'));
  // overlay re-evaluates x every frame (drawbox does not)
  const moving = (x, out) => ff(['-f', 'lavfi', '-i', 'color=c=black:s=320x180:r=30:d=2', '-f', 'lavfi', '-i', 'color=c=white:s=40x60:r=30:d=2',
    '-filter_complex', `[0][1]overlay=x='${x}':y=60:eval=frame`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', join(dir, out)]);
  moving('140+100*sin(2*PI*t*30/59)', 'loop.mp4');
  moving('t*120', 'oneway.mp4');
  assert.equal(qa(join(dir, 'loop.mp4'), { loop: true }).loop.seamless, true);
  assert.equal(qa(join(dir, 'oneway.mp4'), { loop: true }).loop.seamless, false);
});

test('om qa: a film that stands still at the start and never cuts is flagged; a moving one is not', { skip: spawnSync('ffmpeg', ['-version']).status !== 0 && 'no ffmpeg' }, async () => {
  const { qa: runQa } = await import('../cli/lib/qa.js');
  const dir = mkdtempSync(join(tmpdir(), 'om-qa-flat-'));
  // a small square drifting slowly over black for 8 s: the "glow on an empty frame" opening
  const slow = join(dir, 'slow.mp4'), busy = join(dir, 'busy.mp4');
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=black:s=320x180:d=8:r=30', '-vf', "drawbox=x='t*2':y=80:w=12:h=12:color=white:t=fill", '-pix_fmt', 'yuv420p', slow]);
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=30:duration=8', '-pix_fmt', 'yuv420p', busy]);
  const a = runQa(slow), b = runQa(busy);
  assert.equal(a.opening.flat, true);
  assert.equal(a.flatFilm, true);
  assert.equal(b.opening.flat, false);
  assert.equal(b.flatFilm, false);
  // frame 0 is the poster: the lone mark on black is an empty one, the busy film is not
  assert.equal(a.firstFrame.empty, true);
  assert.equal(b.firstFrame.empty, false);
  // a film that fades up from black: empty at 0, and qa says when the frame fills
  const fade = join(dir, 'fade.mp4');
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=30:duration=4', '-vf', 'fade=in:st=0:d=1.5', '-pix_fmt', 'yuv420p', fade]);
  const c = runQa(fade);
  assert.equal(c.firstFrame.empty, true);
  assert.ok(c.firstFrame.contentAt > 0.2 && c.firstFrame.contentAt < 1.6, JSON.stringify(c.firstFrame));
});
