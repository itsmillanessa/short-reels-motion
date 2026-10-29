// Safe zones of the vertical feeds: where TikTok, Instagram Reels and YouTube Shorts draw their own interface
// (tabs and search on top, caption, sound and nav at the bottom, like/comment/share buttons down the right).
// Text there is covered on the phone even though the render shows it. Measured on 1080×1920 from the apps'
// interfaces in 2026 and rounded outward; the apps move these bands now and then, so they are a guide, not a law.
// Only vertical frames are judged (9:16 and anything taller than 4:5): a 16:9 film is not played full screen in a feed.

export const PLATFORMS = {
  tiktok: { label: 'TikTok', top: 150, bottom: 420, right: 150, rightFrom: 760, left: 40 },
  reels: { label: 'Reels', top: 210, bottom: 400, right: 130, rightFrom: 900, left: 40 },
  shorts: { label: 'Shorts', top: 140, bottom: 360, right: 140, rightFrom: 820, left: 40 },
};
const BASE_W = 1080, BASE_H = 1920;

export const isVertical = (w, h) => w > 0 && h / w >= 1.5;

// The platforms a film is made for: data-platforms="tiktok,reels" on the root, all three when absent.
export function platformsOf(attr) {
  if (attr == null || !String(attr).trim()) return Object.keys(PLATFORMS);
  const list = String(attr).toLowerCase().split(/[\s,]+/).filter(Boolean);
  const bad = list.filter((p) => !PLATFORMS[p]);
  if (bad.length) throw new Error(`data-platforms: unknown ${bad.join(', ')} (use ${Object.keys(PLATFORMS).join(', ')})`);
  return list;
}

// The covered bands of one platform as rectangles in the film's own pixels (scaled from 1080×1920).
export function zonesFor(platform, W, H) {
  const p = PLATFORMS[platform], sx = W / BASE_W, sy = H / BASE_H;
  return [
    { side: 'top', x: 0, y: 0, w: W, h: p.top * sy },
    { side: 'bottom', x: 0, y: H - p.bottom * sy, w: W, h: p.bottom * sy },
    { side: 'right', x: W - p.right * sx, y: p.rightFrom * sy, w: p.right * sx, h: H - p.rightFrom * sy },
    { side: 'left', x: 0, y: 0, w: p.left * sx, h: H },
  ];
}

// The union of what every chosen platform covers: one rectangle per side, the widest band wins.
export function unionZones(platforms, W, H) {
  const by = new Map();
  for (const p of platforms) for (const z of zonesFor(p, W, H)) {
    const prev = by.get(z.side);
    if (!prev) { by.set(z.side, { ...z, platforms: [p] }); continue; }
    prev.platforms.push(p);
    const x0 = Math.min(prev.x, z.x), y0 = Math.min(prev.y, z.y), x1 = Math.max(prev.x + prev.w, z.x + z.w), y1 = Math.max(prev.y + prev.h, z.y + z.h);
    Object.assign(prev, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
  }
  return [...by.values()];
}

const SIDE = { top: 'the top bar', bottom: 'the caption and sound at the bottom', right: 'the buttons on the right', left: 'the left edge' };

// Text boxes ({ name, text, x, y, w, h, safe }) that a feed's interface covers. A box counts when more than 10% of
// it (or 24 px of its height or width, whichever is less) is under a band; safe:false is a waived element.
export function unsafeText(boxes, platforms, W, H) {
  const out = [];
  for (const b of boxes) {
    if (b.safe === false || b.w < 2 || b.h < 2) continue;
    const hits = [];
    for (const p of platforms) for (const z of zonesFor(p, W, H)) {
      const iw = Math.min(b.x + b.w, z.x + z.w) - Math.max(b.x, z.x), ih = Math.min(b.y + b.h, z.y + z.h) - Math.max(b.y, z.y);
      if (iw <= 0 || ih <= 0) continue;
      const deep = (z.side === 'top' || z.side === 'bottom') ? ih >= Math.min(24, b.h * 0.5) : iw >= Math.min(24, b.w * 0.5);
      if (iw * ih > 0.1 * b.w * b.h || deep) hits.push({ platform: p, side: z.side });
    }
    if (!hits.length) continue;
    const sides = [...new Set(hits.map((h) => h.side))];
    const names = [...new Set(hits.map((h) => PLATFORMS[h.platform].label))];
    out.push({ code: 'unsafe-zone', sides, platforms: [...new Set(hits.map((h) => h.platform))],
      message: `${b.name} "${b.text}" sits under ${sides.map((s) => SIDE[s]).join(' and ')} on ${names.join(', ')} — the app's interface covers it on the phone. Move it inside the safe area (om studio shows it with S), or waive it with data-layout-allow-safe-zone` });
  }
  return out;
}
