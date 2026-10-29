// 卡通与扁平插画 TOON：Kurzgesagt 式「无描边、双色分面」、柔光；故事型（storytime）的叙述者（TOON.person，Short Reels Motion 自绘、可配置）、
// pose-to-pose 换姿势（快切＋身体挤压回弹）、眨眼时刻表、口型读口播包络（一拍二）、汗滴、漫画符号。
(() => {
const W = 1920, H = 1080;
const { clamp, lerp } = U;
const TOON = window.TOON = {};

// ---------- 扁平插画 ----------
// 双色分面（无描边、靠色块分面）：clip(S) → 整块阴影色 → 往光源方向平移 v 填高光 → 再往回挪 w 填本色：右下留阴影带、左上留细高光边
TOON.flat = (c, path, base, sh, hi, v = [10, 12], w = [4, 5]) => {
  c.save(); c.clip(path);
  c.fillStyle = sh || base; c.fill(path);
  c.save(); c.translate(-v[0], -v[1]); c.fillStyle = hi || base; c.fill(path); c.restore();
  c.save(); c.translate(-v[0] + w[0], -v[1] + w[1]); c.fillStyle = base; c.fill(path); c.restore();
  c.restore();
};
// 柔光：径向渐变方块（发光物、眼睛、信号脉冲）
TOON.glow = (c, x, y, r, col, a = 1) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, PAINT.rgb(PAINT.hex(col), a)); g.addColorStop(1, PAINT.rgb(PAINT.hex(col), 0)); c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r); };
// 竖向渐变（天空）
TOON.vgrad = (c, y0, y1, cols) => { const g = c.createLinearGradient(0, y0, 0, y1); cols.forEach((k, i) => g.addColorStop(i / (cols.length - 1), k)); return g; };
TOON.circle = (x, y, r) => { const p = new Path2D(); p.arc(x, y, r, 0, Math.PI * 2); return p; };
TOON.ellipse = (x, y, rx, ry, a = 0) => { const p = new Path2D(); p.ellipse(x, y, rx, ry, a, 0, Math.PI * 2); return p; };

// ---------- 口型：读口播包络 ----------
// window.VO_ENV = {fps, a:[...]}（0..1 的 RMS 包络，由音频脚本从口播 wav 生成）。口型「一拍二」：每 1/12 秒才换一次形。
TOON.env = t => { const E = window.VO_ENV; if (!E) return 0; const i = Math.round(t * E.fps); return i < 0 || i >= E.a.length ? 0 : E.a[i]; };
TOON.mouth = (t, fps = 12) => { const v = TOON.env(MO.step(t, fps)); return v < 0.06 ? 0 : v < 0.22 ? 1 : 2; };   // 0 闭 1 半 2 张

// ---------- the narrator: a person each creator dresses as themselves ----------
// Front view, oval head on a neck, a torso with sleeves, long legs in trousers, sneakers. Nothing in it is fixed:
// skin, hair, clothes and one accessory come from `look` (the storytime spec's data.character), so the narrator of a
// creator's short can look like the creator. Defaults are neutral.
// o: { x, y (feet), s (head size px), pose:{l,r} (hand targets relative to the shoulder, in head units), expr, mouth (0/1/2),
//      blink, look:[dx,dy] (eyes), squash (vertical scale about the feet, volume kept), tilt, bob, browUp, lw, character }
// expr: 'talk' | 'happy' | 'blank' | 'worry' | 'shock'. Returns { hl, hr (hands), head:[x,y] }.
// character: { skin, hair: short|long|curly|bun|buzz|none, hairColor, top: hoodie|tee|shirt, topColor, bottomColor,
//              shoes, accessory: none|glasses|headphones|cap, accessoryColor }
const LINE = '#1B1B1F';
TOON.LOOK = { skin: '#E8B48E', hair: 'short', hairColor: '#2B2119', top: 'hoodie', topColor: '#2F6FED', bottomColor: '#252A36', shoes: '#F4F4F0', accessory: 'none', accessoryColor: '#1B1B1F' };
TOON.look = (ch) => ({ ...TOON.LOOK, ...(ch && typeof ch === 'object' ? ch : {}) });
const shade = (hex, k) => { const c = PAINT.hex(hex); return PAINT.rgb([c[0] * k, c[1] * k, c[2] * k].map(v => Math.max(0, Math.min(255, v))), 1); };
TOON.POSES = {
  rest:  { l: [-0.95, 1.05], r: [0.95, 1.05] },
  talk:  { l: [-0.95, 1.05], r: [1.05, 0.55] },          // one hand a little up: the default while talking
  point: { l: [-0.95, 1.05], r: [1.75, -0.15] },         // points to the right of the frame
  type:  { l: [-0.55, 0.62], r: [0.55, 0.62] },          // both hands in front of the chest (typing)
  shrug: { l: [-1.45, -0.05], r: [1.45, -0.05], palms: 1 },
  stiff: { l: [-0.78, 1.25], r: [0.78, 1.25] },          // frozen
};
// hair behind the head (long hair falls to the shoulders, a bun sits on top): drawn before the face
function hairBack(c, L, R, lw) {
  c.fillStyle = L.hairColor; c.strokeStyle = LINE; c.lineWidth = lw;
  if (L.hair === 'long') { c.beginPath(); c.moveTo(-R * 0.86, -R * 0.2); c.bezierCurveTo(-R * 1.05, R * 0.6, -R * 0.95, R * 1.15, -R * 0.7, R * 1.3);
    c.lineTo(R * 0.7, R * 1.3); c.bezierCurveTo(R * 0.95, R * 1.15, R * 1.05, R * 0.6, R * 0.86, -R * 0.2); c.closePath(); c.fill(); c.stroke(); }
  if (L.hair === 'bun') { c.beginPath(); c.arc(0, -R * 1.02, R * 0.34, 0, Math.PI * 2); c.fill(); c.stroke(); }
}
// hair on top of the face: a cap of hair over the forehead, shaped per style
function hairFront(c, L, R, lw) {
  if (L.hair === 'none') return;
  c.fillStyle = L.hairColor; c.strokeStyle = LINE; c.lineWidth = lw;
  const p = new Path2D();
  if (L.hair === 'curly') {                                           // a ring of curls around the crown, a short fringe
    for (let i = 0; i <= 10; i++) { const t = Math.PI * (1.02 + i * 0.096), cx = Math.cos(t) * R * 0.86, cy = -R * 0.08 + Math.sin(t) * R * 0.95;
      c.beginPath(); c.arc(cx, cy, R * 0.2, 0, Math.PI * 2); c.fill(); c.stroke(); }
    p.moveTo(-R * 0.8, -R * 0.2); p.bezierCurveTo(-R * 0.86, -R * 0.98, R * 0.86, -R * 0.98, R * 0.8, -R * 0.2);
    for (let i = 0; i < 5; i++) { const x1 = R * (0.8 - (i + 1) * 0.32); p.quadraticCurveTo(x1 + R * 0.16, -R * 0.36, x1, -R * 0.5 + (i % 2) * R * 0.06); }
    c.fill(p); return;
  } else if (L.hair === 'buzz') {
    p.moveTo(-R * 0.84, -R * 0.2); p.bezierCurveTo(-R * 0.8, -R * 1.1, R * 0.8, -R * 1.1, R * 0.84, -R * 0.2);
    p.quadraticCurveTo(0, -R * 0.62, -R * 0.84, -R * 0.2);
    c.save(); c.globalAlpha = 0.55; c.fill(p); c.restore(); return;
  } else { // short, long and bun: volume over the crown, a fringe in three soft locks swept to one side
    p.moveTo(-R * 0.8, -R * 0.22); p.bezierCurveTo(-R * 0.92, -R * 1.02, R * 0.9, -R * 1.1, R * 0.82, -R * 0.26);
    p.quadraticCurveTo(R * 0.62, -R * 0.36, R * 0.44, -R * 0.52); p.quadraticCurveTo(R * 0.26, -R * 0.4, R * 0.06, -R * 0.56);
    p.quadraticCurveTo(-R * 0.18, -R * 0.42, -R * 0.4, -R * 0.54); p.quadraticCurveTo(-R * 0.62, -R * 0.4, -R * 0.8, -R * 0.22);
  }
  p.closePath(); c.fill(p); c.stroke(p);
}
function accessoryFront(c, L, R, lw, eyeY) {
  c.strokeStyle = LINE; c.lineWidth = lw;
  if (L.accessory === 'glasses') {                                     // rectangular frames: thick, slightly rounded
    c.lineWidth = lw * 1.4; c.strokeStyle = L.accessoryColor;
    for (const sx of [-1, 1]) { c.beginPath(); c.roundRect(sx * R * 0.36 - R * 0.24, eyeY - R * 0.16, R * 0.48, R * 0.32, R * 0.07); c.stroke(); }
    c.beginPath(); c.moveTo(-R * 0.12, eyeY - R * 0.04); c.lineTo(R * 0.12, eyeY - R * 0.04); c.stroke();
  } else if (L.accessory === 'headphones') {                           // band over the hair, a cup on each ear
    c.lineWidth = R * 0.11; c.strokeStyle = L.accessoryColor; c.beginPath(); c.arc(0, -R * 0.05, R * 0.98, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
    c.fillStyle = L.accessoryColor; c.strokeStyle = LINE; c.lineWidth = lw;
    for (const sx of [-1, 1]) { c.beginPath(); c.roundRect(sx * R * 0.9 - R * 0.14, -R * 0.1, R * 0.28, R * 0.42, R * 0.1); c.fill(); c.stroke(); }
  } else if (L.accessory === 'cap') {                                  // a cap with its peak to the front
    c.fillStyle = L.accessoryColor; c.strokeStyle = LINE; c.lineWidth = lw;
    c.beginPath(); c.moveTo(-R * 0.88, -R * 0.36); c.bezierCurveTo(-R * 0.86, -R * 1.2, R * 0.86, -R * 1.2, R * 0.88, -R * 0.36); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-R * 0.95, -R * 0.38); c.quadraticCurveTo(R * 0.2, -R * 0.56, R * 1.3, -R * 0.36); c.quadraticCurveTo(R * 1.34, -R * 0.24, R * 1.18, -R * 0.22); c.quadraticCurveTo(R * 0.2, -R * 0.3, -R * 0.95, -R * 0.38); c.closePath(); c.fill(); c.stroke();
  }
}
TOON.person = (c, o) => {
  const R = o.s, x = o.x, y = o.y, lw = o.lw || Math.max(4, R * 0.05), sq = o.squash || 1, Lk = TOON.look(o.character);
  const pose = o.pose || TOON.POSES.rest;
  c.save(); c.translate(x, y); c.scale(1 / Math.sqrt(sq), sq);
  c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = LINE; c.lineWidth = lw;
  const hipY = -R * 0.78, chestY = -R * 1.78, shoulderY = chestY + R * 0.16;
  const shL = [-R * 0.5, shoulderY], shR = [R * 0.5, shoulderY];
  for (const sx of [-1, 1]) {                                          // legs: trousers to the ankle, a sneaker each
    c.fillStyle = Lk.bottomColor; c.beginPath(); c.roundRect(sx * R * 0.2 - R * 0.15, hipY - R * 0.05, R * 0.3, R * 0.78, R * 0.08); c.fill(); c.stroke();
    c.fillStyle = Lk.shoes; c.beginPath(); c.roundRect(sx * R * 0.22 - R * 0.2 + sx * R * 0.04, -R * 0.13, R * 0.4, R * 0.15, R * 0.07); c.fill(); c.stroke();
    c.fillStyle = LINE; c.fillRect(sx * R * 0.22 - R * 0.19 + sx * R * 0.04, -R * 0.03, R * 0.38, R * 0.03);
  }
  const torso = new Path2D();                                          // torso: shoulders wider than the hips
  torso.moveTo(-R * 0.4, hipY + R * 0.06); torso.lineTo(-R * 0.58, chestY + R * 0.3);
  torso.quadraticCurveTo(-R * 0.6, chestY, -R * 0.3, chestY - R * 0.04); torso.lineTo(R * 0.3, chestY - R * 0.04);
  torso.quadraticCurveTo(R * 0.6, chestY, R * 0.58, chestY + R * 0.3); torso.lineTo(R * 0.4, hipY + R * 0.06); torso.closePath();
  c.fillStyle = Lk.topColor; c.fill(torso); c.stroke(torso);
  c.save(); c.clip(torso); c.strokeStyle = shade(Lk.topColor, 0.72); c.lineWidth = lw * 0.8;
  if (Lk.top === 'hoodie') {                                           // pocket, strings
    c.beginPath(); c.roundRect(-R * 0.3, hipY - R * 0.36, R * 0.6, R * 0.28, R * 0.06); c.stroke();
    for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * R * 0.1, chestY + R * 0.06); c.lineTo(sx * R * 0.12, chestY + R * 0.42); c.stroke(); }
  } else if (Lk.top === 'shirt') {                                     // placket and buttons
    c.beginPath(); c.moveTo(0, chestY + R * 0.06); c.lineTo(0, hipY); c.stroke();
    c.fillStyle = shade(Lk.topColor, 0.72); for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(R * 0.06, chestY + R * (0.3 + i * 0.25), R * 0.03, 0, Math.PI * 2); c.fill(); }
  }
  c.restore();
  // arms: shoulder → hand on a curve, the sleeve in the top's colour down to the forearm
  const arm = (sh, tgt, side) => {
    const hx = sh[0] + tgt[0] * R * 0.72, hy = sh[1] + tgt[1] * R * 0.72;
    const mx = (sh[0] + hx) / 2 + side * R * 0.1, my = Math.max(sh[1], hy) + R * 0.1;
    c.beginPath(); c.moveTo(sh[0], sh[1]); c.quadraticCurveTo(mx, my, hx, hy);
    c.strokeStyle = LINE; c.lineWidth = R * 0.18 + lw; c.stroke(); c.strokeStyle = Lk.skin; c.lineWidth = R * 0.18; c.stroke();
    const sleeve = Lk.top === 'tee' ? 0.32 : 0.78;                      // a tee leaves the forearm bare
    c.beginPath(); c.moveTo(sh[0], sh[1]); c.quadraticCurveTo(lerp(sh[0], mx, sleeve), lerp(sh[1], my, sleeve), lerp(lerp(sh[0], mx, sleeve), lerp(mx, hx, sleeve), sleeve), lerp(lerp(sh[1], my, sleeve), lerp(my, hy, sleeve), sleeve));
    c.strokeStyle = LINE; c.lineWidth = R * 0.27 + lw; c.stroke(); c.strokeStyle = Lk.topColor; c.lineWidth = R * 0.27; c.stroke();
    c.fillStyle = Lk.skin; c.strokeStyle = LINE; c.lineWidth = lw; c.beginPath(); c.ellipse(hx, hy, R * 0.13, R * 0.15, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    return [hx, hy];
  };
  c.lineWidth = lw;
  const hl = arm(shL, pose.l, -1), hr = arm(shR, pose.r, 1);
  c.restore(); c.save(); c.translate(x, y); c.scale(1 / Math.sqrt(sq), sq);
  c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = LINE; c.lineWidth = lw;
  c.fillStyle = Lk.skin; c.beginPath(); c.roundRect(-R * 0.16, chestY - R * 0.36, R * 0.32, R * 0.4, R * 0.08); c.fill(); c.stroke();   // neck
  if (Lk.top === 'hoodie') { c.fillStyle = shade(Lk.topColor, 0.85); c.beginPath(); c.ellipse(0, chestY - R * 0.02, R * 0.42, R * 0.12, 0, 0, Math.PI * 2); c.fill(); c.stroke(); }
  if (Lk.top === 'shirt') { c.fillStyle = Lk.topColor; for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(0, chestY + R * 0.1); c.lineTo(sx * R * 0.26, chestY - R * 0.06); c.lineTo(sx * R * 0.08, chestY - R * 0.1); c.closePath(); c.fill(); c.stroke(); } }
  const hy = chestY - R * 0.98 + (o.bob || 0);
  c.translate(0, hy); c.rotate(o.tilt || 0);
  hairBack(c, Lk, R, lw);
  c.fillStyle = Lk.skin; c.strokeStyle = LINE; c.lineWidth = lw;
  for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * R * 0.82, R * 0.1, R * 0.13, R * 0.18, 0, 0, Math.PI * 2); c.fill(); c.stroke(); }   // ears
  c.beginPath(); c.ellipse(0, 0, R * 0.8, R * 0.92, 0, 0, Math.PI * 2); c.fill(); c.stroke();                                              // face: taller than wide
  hairFront(c, Lk, R, lw);
  // brows carry the expression: [up/down, inner end relative to the outer] (negative = inner end raised = worried)
  const ex = o.expr || 'talk', lk = o.look || [0, 0], eyeY = R * 0.12;
  const brow = { talk: [0, 0], happy: [-0.05, 0.03], blank: [0.03, 0], worry: [-0.02, -0.11], shock: [-0.11, 0.02] }[ex] || [0, 0];
  if (o.browUp) brow[0] -= o.browUp;
  c.strokeStyle = shade(Lk.hairColor, 0.9); c.lineWidth = lw * 1.5;
  for (const sx of [-1, 1]) { const by = -R * 0.16 + brow[0] * R; c.beginPath(); c.moveTo(sx * R * 0.5, by + R * 0.02); c.quadraticCurveTo(sx * R * 0.35, by - R * 0.04, sx * R * 0.18, by + brow[1] * R); c.stroke(); }
  c.strokeStyle = LINE; c.lineWidth = lw;
  for (const sx of [-1, 1]) {                                          // eyes: dark ovals with a highlight, a line when blinking
    const gx = sx * R * 0.34, pr = ex === 'blank' ? R * 0.04 : ex === 'shock' ? R * 0.055 : R * 0.075;
    c.fillStyle = LINE;
    if (o.blink) { c.beginPath(); c.moveTo(gx - R * 0.09 + lk[0] * R * 0.08, eyeY + lk[1] * R * 0.06); c.quadraticCurveTo(gx + lk[0] * R * 0.08, eyeY + R * 0.04, gx + R * 0.09 + lk[0] * R * 0.08, eyeY + lk[1] * R * 0.06); c.stroke(); }
    else { c.beginPath(); c.ellipse(gx + lk[0] * R * 0.09, eyeY + lk[1] * R * 0.07, pr, pr * (ex === 'blank' ? 1 : 1.3), 0, 0, Math.PI * 2); c.fill();
      if (ex !== 'blank') { c.fillStyle = '#fff'; c.beginPath(); c.arc(gx + lk[0] * R * 0.09 - pr * 0.35, eyeY + lk[1] * R * 0.07 - pr * 0.45, pr * 0.32, 0, Math.PI * 2); c.fill(); } }
  }
  c.strokeStyle = shade(Lk.skin, 0.7); c.lineWidth = lw * 0.9;                                                                            // nose
  c.beginPath(); c.moveTo(R * 0.02, eyeY + R * 0.08); c.quadraticCurveTo(R * 0.1, eyeY + R * 0.24, -R * 0.03, eyeY + R * 0.27); c.stroke();
  c.strokeStyle = LINE; c.lineWidth = lw;
  c.fillStyle = 'rgba(240,120,110,0.28)'; for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * R * 0.52, R * 0.42, R * 0.1, R * 0.055, 0, 0, Math.PI * 2); c.fill(); }
  accessoryFront(c, Lk, R, lw, eyeY);
  const m = o.mouth || 0, my = R * 0.56;                                // mouth: closed per expression, or two open shapes
  c.strokeStyle = LINE; c.lineWidth = lw;
  if (ex === 'blank' && !m) { c.beginPath(); c.moveTo(-R * 0.1, my); c.lineTo(R * 0.1, my); c.stroke(); }
  else if (ex === 'worry' && !m) { c.beginPath(); c.moveTo(-R * 0.13, my + R * 0.03); c.quadraticCurveTo(-R * 0.05, my - R * 0.04, 0, my + R * 0.01); c.quadraticCurveTo(R * 0.06, my + R * 0.05, R * 0.13, my - R * 0.01); c.stroke(); }
  else if (!m) { c.beginPath(); c.moveTo(-R * 0.15, my - R * 0.02); c.quadraticCurveTo(0, my + R * 0.11, R * 0.15, my - R * 0.02); c.stroke(); }
  else {
    const mh = m === 1 ? R * 0.1 : R * 0.2, mw = m === 1 ? R * 0.14 : R * 0.18;
    c.fillStyle = '#5A1E28'; c.beginPath(); c.moveTo(-mw, my - R * 0.03); c.quadraticCurveTo(0, my - R * 0.06, mw, my - R * 0.03); c.quadraticCurveTo(mw * 0.9, my + mh, 0, my + mh); c.quadraticCurveTo(-mw * 0.9, my + mh, -mw, my - R * 0.03); c.closePath(); c.fill();
    c.save(); c.clip(); c.fillStyle = '#E8737A'; c.beginPath(); c.ellipse(0, my + mh, mw * 0.6, mh * 0.45, 0, 0, Math.PI * 2); c.fill(); c.restore(); c.stroke();
  }
  c.restore();
  return { hl, hr, head: [x, y + hy * sq] };
};
// The same person from behind, over the shoulder (storytime's insert shot): shoulders, neck, the back of the head.
// Drawn around (0, 0) in a 1-unit-per-pixel frame where the head is ~190 wide; the caller scales and places it.
TOON.personBack = (c, character) => {
  const Lk = TOON.look(character), lw = 7;
  c.save(); c.lineWidth = lw; c.strokeStyle = LINE; c.lineJoin = 'round';
  c.fillStyle = Lk.topColor; c.beginPath(); c.ellipse(0, 300, 330, 200, 0, Math.PI, 0); c.fill(); c.stroke();
  if (Lk.top === 'hoodie') { c.fillStyle = shade(Lk.topColor, 0.85); c.beginPath(); c.ellipse(0, 150, 170, 70, 0, Math.PI, 0); c.fill(); c.stroke(); }
  c.fillStyle = Lk.skin; c.beginPath(); c.roundRect(-58, 120, 116, 120, 26); c.fill(); c.stroke();
  for (const k of [-1, 1]) { c.beginPath(); c.ellipse(k * 160, 40, 28, 42, k * 0.15, 0, 7); c.fill(); c.stroke(); }
  const back = Lk.hair === 'none' || Lk.hair === 'buzz' ? Lk.skin : Lk.hairColor;
  c.fillStyle = back; c.beginPath(); c.ellipse(0, 10, 160, 175, 0, 0, 7); c.fill(); c.stroke();
  if (back === Lk.hairColor) {
    c.save(); c.beginPath(); c.ellipse(0, 10, 160, 175, 0, 0, 7); c.clip();
    c.strokeStyle = shade(Lk.hairColor, 1.45); c.lineWidth = 10; c.lineCap = 'round';
    for (const [a, b] of [[-0.9, -0.55], [-0.35, -0.05], [0.25, 0.55]]) { c.beginPath(); c.arc(0, 150, 300, Math.PI * 1.5 + a * 0.45, Math.PI * 1.5 + b * 0.45); c.stroke(); }
    c.restore();
    c.fillStyle = Lk.hairColor; c.strokeStyle = LINE; c.lineWidth = lw;
  }
  if (Lk.hair === 'buzz') { c.save(); c.globalAlpha = 0.55; c.fillStyle = Lk.hairColor; c.beginPath(); c.ellipse(0, 20, 160, 175, 0, Math.PI * 1.05, Math.PI * 1.95); c.fill(); c.restore(); }
  if (Lk.hair === 'long') { c.fillStyle = Lk.hairColor; c.beginPath(); c.moveTo(-158, 20); c.bezierCurveTo(-175, 200, -140, 260, -110, 280); c.lineTo(110, 280); c.bezierCurveTo(140, 260, 175, 200, 158, 20); c.fill(); c.stroke(); }
  if (Lk.hair === 'bun') { c.fillStyle = Lk.hairColor; c.beginPath(); c.arc(0, -170, 60, 0, 7); c.fill(); c.stroke(); }
  if (Lk.hair === 'curly') { c.fillStyle = Lk.hairColor; for (let i = 0; i < 9; i++) { const a = Math.PI * (1.05 + i * 0.1); c.beginPath(); c.arc(Math.cos(a) * 165, 30 + Math.sin(a) * 185, 34, 0, 7); c.fill(); c.stroke(); } }
  if (Lk.accessory === 'headphones') { c.strokeStyle = Lk.accessoryColor; c.lineWidth = 26; c.beginPath(); c.arc(0, 40, 175, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
    c.fillStyle = Lk.accessoryColor; c.strokeStyle = LINE; c.lineWidth = lw; for (const k of [-1, 1]) { c.beginPath(); c.roundRect(k * 168 - 30, 10, 60, 90, 22); c.fill(); c.stroke(); } }
  if (Lk.accessory === 'cap') { c.fillStyle = Lk.accessoryColor; c.strokeStyle = LINE; c.lineWidth = lw; c.beginPath(); c.moveTo(-168, -10); c.bezierCurveTo(-165, -230, 165, -230, 168, -10); c.closePath(); c.fill(); c.stroke(); }
  c.restore();
};

// ---------- pose-to-pose ----------
// keys = [[t, poseName, expr], ...]（同一条时间轴的秒）。换姿势：手臂 0.1s expoOut 过去（24fps 下 3 帧的「快切」），
// 身体同时挤压 7% 后按弹簧回弹（3.5Hz / 衰减 9）。返回 { pose, expr, squash, since }
TOON.poseAt = (keys, t, poses = TOON.POSES) => {
  let k = 0; for (let i = 0; i < keys.length; i++) if (t >= keys[i][0]) k = i;
  const cur = poses[keys[k][1]], prv = poses[keys[Math.max(0, k - 1)][1]];
  const dt = t - keys[k][0], q = k === 0 ? 1 : MO.expoOut(clamp(dt / 0.1));
  const mix = (a, b) => [lerp(a[0], b[0], q), lerp(a[1], b[1], q)];
  return { pose: { l: mix(prv.l, cur.l), r: mix(prv.r, cur.r), palms: cur.palms }, expr: keys[k][2], squash: k === 0 ? 1 : 1 + MO.settle(dt, -0.07, 3.5, 9), since: dt };
};
// 眨眼：固定时刻表（间隔 2.4–3.6s 的「随机」写死），闭眼 dur 秒（24fps 下 2 帧 ≈ 0.083s；「无语」的慢眨眼 3 帧）
TOON.blinkAt = (t, times, dur = 0.083) => times.some(b => t >= b && t < b + dur) ? 1 : 0;
// 活着：说话时头随口型轻点（每次张嘴下沉 0.015R）＋呼吸（1.6s 一周期，身体 ±1.2%）
TOON.alive = (t, R) => ({ bob: TOON.mouth(t) * R * 0.015, breathe: 1 + 0.012 * Math.sin(2 * Math.PI * t / 1.6) });

// ---------- 漫画符号 ----------
// 汗滴：p 0..1 沿脸侧滑下
TOON.sweat = (c, x, y, r, p) => {
  const yy = y + p * r * 3.2, a = p < 0.85 ? 1 : 1 - (p - 0.85) / 0.15;
  c.save(); c.globalAlpha = a; c.fillStyle = '#9ED8F5'; c.strokeStyle = LINE; c.lineWidth = Math.max(3, r * 0.12);
  c.beginPath(); c.moveTo(x, yy - r * 1.5); c.quadraticCurveTo(x + r * 1.05, yy + r * 0.1, x, yy + r); c.quadraticCurveTo(x - r * 1.05, yy + r * 0.1, x, yy - r * 1.5); c.fill(); c.stroke();
  c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x - r * 0.3, yy - r * 0.05, r * 0.18, r * 0.32, 0, 0, Math.PI * 2); c.fill(); c.restore();
};
// 「？」「！」弹出（白描边，过冲 30%）
TOON.mark = (c, ch, x, y, p, size = 160, color = LINE) => { if (p <= 0) return; TY.pop(c, ch, x, y, p, { size, fam: 'PuHui-Black', color, stroke: '#fff', strokeW: size * 0.12, over: 3 }); };
})();
