// Short Reels Motion — motion helpers for vertical shorts (copy to vendor/srm.js; include after vendor/om.js).
// Each one adds tweens to a paused GSAP timeline at a time in seconds and returns that time, so calls chain on cues:
//   SRM.slam(tl, '#hook', OM.cue('treinta'));
// They carry what the shorts made so far taught (2026-10): every exit also sets autoAlpha 0 at its end (a mis-anchored
// exit must not leave a layer under everything that follows), a flash lasts 2 frames at ≤ .22 (shorter reads as a pop),
// numbers are written once in the HTML and revealed (a tween of textContent turns "38.00" into 38).
(() => {
  const OM = window.OM || {};
  const sfx = (name, at, opts) => (OM.sfx ? OM.sfx(name, at, opts) : at);
  const SRM = (window.SRM = {});

  // The word of the narration at `at`: exact word, nth time, its start (or 'end'). Same rule as OM.cue.
  SRM.cue = (word, nth = 1, edge) => OM.cue(word, nth, edge);
  // A time from a step: { word, nth, edge, offset } anchors to the narration when there is one, else { at } seconds.
  SRM.when = (step, fallback = 0) => {
    if (step && step.word && OM.words && OM.words().length) { try { return Math.max(0, OM.cue(step.word, step.nth || 1, step.edge) + (Number(step.offset) || 0)); } catch (e) { console.warn('[srm] ' + e.message); } }
    return step && step.at != null ? Number(step.at) : fallback;
  };

  // In: lands big and settles (the hook, a keyword).
  SRM.slam = (tl, el, at, { scale = 1.6, dur = 0.38, sound = 'impact', gain = 0.6 } = {}) => {
    tl.fromTo(el, { autoAlpha: 0, scale }, { autoAlpha: 1, scale: 1, duration: dur, ease: 'expo.out', immediateRender: false }, at);
    if (sound) sfx(sound, at, { gain });
    return at;
  };
  // In: rises out of a mask (.mask > span inside el).
  SRM.rise = (tl, el, at, { dur = 0.5 } = {}) => {
    tl.set(el, { autoAlpha: 1 }, Math.max(0, at - 0.02));
    tl.fromTo(gsap.utils.toArray(el.querySelectorAll ? el.querySelectorAll('.mask > span') : document.querySelectorAll(el + ' .mask > span')), { yPercent: 140 }, { yPercent: 0, duration: dur, stagger: 0.06, ease: 'expo.out', immediateRender: false }, at);
    return at;
  };
  // In: a small label slides in from the left.
  SRM.kickIn = (tl, el, at) => { tl.fromTo(el, { autoAlpha: 0, x: -24 }, { autoAlpha: 1, x: 0, duration: 0.35, ease: 'power3.out', immediateRender: false }, at); return at; };
  // In: a pill behind a word grows from the left.
  SRM.pill = (tl, el, at) => { tl.fromTo(el, { scaleX: 0 }, { scaleX: 1, duration: 0.32, ease: 'expo.out', immediateRender: false, transformOrigin: '0 50%' }, at); return at; };
  // Out: whips up and away, ending exactly at `at`.
  SRM.whipOut = (tl, el, at, { gain = 0.55 } = {}) => {
    tl.to(el, { autoAlpha: 0, y: -120, duration: 0.26, ease: 'power2.in' }, Math.max(0, at - 0.26));
    sfx('whip', Math.max(0, at - 0.26), { gain });
    tl.set(el, { autoAlpha: 0 }, at);
    return at;
  };
  // Out: squashes flat from the top, ending at `at`.
  SRM.squash = (tl, el, at) => {
    tl.to(el, { scaleY: 0, transformOrigin: '50% 0', duration: 0.22, ease: 'power3.in' }, Math.max(0, at - 0.22));
    sfx('whip', Math.max(0, at - 0.22), { gain: 0.5 });
    tl.set(el, { autoAlpha: 0 }, at);
    return at;
  };
  // Text typed letter by letter between two times (a prompt being written).
  SRM.typeOn = (tl, el, text, from, to) => {
    const node = typeof el === 'string' ? document.querySelector(el) : el, o = { n: 0 };
    tl.fromTo(o, { n: 0 }, { n: text.length, duration: Math.max(0.2, to - from), ease: 'none', immediateRender: false, onUpdate: () => { node.textContent = text.slice(0, Math.round(o.n)); } }, from);
    tl.set(node, { textContent: '' }, 0);
    return from;
  };
  // A number counting up to `to` (integers; for decimals pre-write the final text and reveal it instead).
  SRM.counter = (tl, el, from, until, to, fmt = (n) => Math.round(n).toLocaleString('es-MX')) => {
    const node = typeof el === 'string' ? document.querySelector(el) : el, o = { n: 0 };
    tl.fromTo(o, { n: 0 }, { n: to, duration: Math.max(0.2, until - from), ease: 'power1.out', immediateRender: false, onUpdate: () => { node.textContent = fmt(o.n); } }, from);
    return from;
  };
  // A flash of the accent over the frame (needs an element, default #flash), ≤ .22. Snapped to the frame grid and held at
  // its peak for 2 frames before fading: a peak that lands on a single frame reads as a glitch (om qa: single-frame pop).
  SRM.flash = (tl, at, { el = '#flash', opacity = 0.22, fps = 30 } = {}) => {
    const f = 1 / fps, t0 = Math.round(at / f) * f, peak = Math.min(0.22, opacity);
    tl.fromTo(el, { opacity: 0 }, { opacity: peak, duration: f, ease: 'none', immediateRender: false }, t0);
    tl.to(el, { opacity: 0, duration: 3 * f, ease: 'power1.out' }, t0 + 2 * f);
    return t0;
  };
  // A finger tap at (x, y) in the frame: the dot glides in, a ring ripples out, a click sounds. Needs #tapdot and #ripple.
  SRM.tap = (tl, at, x, y, { dot = '#tapdot', ring = '#ripple' } = {}) => {
    const t0 = Math.max(0, at - 0.35);
    tl.set(dot, { autoAlpha: 1, x: x - 160, y: y + 200 }, t0);
    tl.to(dot, { x, y, duration: 0.35, ease: 'power3.out' }, t0);
    tl.fromTo(ring, { x, y, scale: 0, autoAlpha: 1 }, { scale: 1, autoAlpha: 0, duration: 0.45, ease: 'power2.out', immediateRender: false }, at);
    sfx('click', at, { gain: 0.7 });
    tl.to(dot, { autoAlpha: 0, duration: 0.15 }, at + 0.1);
    return at;
  };
  // A push into part of an element (the phone): scale toward (fx, fy) given as 0–1 of the element, hold, come back.
  SRM.zoom = (tl, el, at, { fx = 0.5, fy = 0.5, scale = 1.8, hold = 1.2 } = {}) => {
    const origin = `${(fx * 100).toFixed(1)}% ${(fy * 100).toFixed(1)}%`;
    tl.to(el, { scale, transformOrigin: origin, duration: 0.45, ease: 'expo.inOut' }, at);
    tl.to(el, { scale: 1, duration: 0.45, ease: 'expo.inOut' }, at + 0.45 + hold);
    sfx('whoosh', at, { gain: 0.35 });
    return at;
  };
  // Show `el` from `at` to `until`; the exit is a quick fade that also hard-sets it off.
  SRM.between = (tl, el, at, until, { fade = 0.12 } = {}) => {
    tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: fade, immediateRender: false }, at);
    tl.to(el, { autoAlpha: 0, duration: fade }, Math.max(at + fade, until - fade));
    tl.set(el, { autoAlpha: 0 }, until);
    return at;
  };
})();
