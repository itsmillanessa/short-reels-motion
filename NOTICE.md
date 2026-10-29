# NOTICE

**Short Reels Motion** © 2026 Alexis Millán — MIT (see `LICENSE`).

Short Reels Motion is built on the engine of **huashu-motion** by Huashu (花叔, https://github.com/alchaincyf/huashu-motion),
MIT, version 0.3.1. Its copyright line stays in `LICENSE`, as the MIT license asks. The git history of this repository
keeps every upstream commit, so what came from huashu-motion and what was changed here can be told apart line by line.

What Short Reels Motion changes or adds over huashu-motion 0.3.1:

- Vertical first: safe zones of TikTok, Reels and Shorts in `om check` and in the templates' layout (`cli/lib/safezones.js`).
- Narration: cues match whole words (Spanish and English), narrated mixes are levelled to -14 LUFS, Spanish scripts get
  a Spanish voice by default.
- Studio in Spanish, English and Chinese; it recovers on its own when restarted.
- The 12 templates, their fields and notes in Spanish; the runtime's region names, notes and messages in the film's
  language (`runtime/clip/clip.js`, `CLIP.tr`).
- Fonts rebuilt with the Latin characters Spanish needs (á é í ó ú ü ñ ¿ ¡ « »), see `fonts/LICENSES.md` and
  `scripts/es/`.
- The end-of-film signature is off by default.
- Name, CLI (`srm`; `om` stays as an alias), documentation.
- The storytime narrator is an original, configurable person (`TOON.person`, `TOON.personBack`): skin, hair, clothes and
  an accessory come from the film's data, so each creator's narrator can look like them. The upstream "bean Huashu"
  character, which huashu-motion excludes from its MIT license, is not included.

Still from upstream, to be replaced by our own: the demo films in `examples/` (`om demo`).

Third-party pieces keep their own licenses: see `THIRD_PARTY.md` (GSAP, Three.js, fonts under SIL OFL 1.1, the clip
runtime from huashu-art-motion under MIT).
