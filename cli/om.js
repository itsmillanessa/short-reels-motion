#!/usr/bin/env node
// srm (also short-reels-motion) — the Short Reels Motion command line, built on huashu-motion (MIT). Agents and people use the same commands.
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OmError, openProject, readSource, readVariables, scan, setVariables, undo, writeSource, snapshot } from './lib/project.js';
import { claim, comments, pending, resolve as resolveComment, setStatus } from './lib/inbox.js';
import { findChrome, chromeVersion, NO_CHROME } from './lib/browser.js';
import { render } from './lib/render.js';
import { cliLang, tr } from './lib/lang.js';

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = JSON.parse(readFileSync(join(PKG, 'package.json'), 'utf8')).version;

const HELP_ES = `Short Reels Motion ${VERSION} — shorts, reels y TikToks hechos por tu agente de código; señalas el cuadro para cambiarlo.
(también short-reels-motion; la documentación del motor dice om, que es el mismo comando; basado en huashu-motion de Huashu, MIT)

  srm grab <url|carpeta> [dir]   el material real del producto en <dir>/materials/: capturas de la página, logo, imágenes, sus colores y tipografía (una URL), o las capturas, iconos, medios y colores del propio proyecto (una carpeta)
  srm new <dir> [--template t]   empezar un proyecto (srm templates las lista)
  srm templates                  plantillas y para qué sirve cada una
  srm demo [dir]                 copiar el video de muestra y abrirlo en el studio
  srm studio [dir] [--lang es|en|zh]   vista previa en vivo, cambios directos, notas para el agente (idioma de la interfaz; también OM_LANG)
  srm inbox [dir] [--wait]       ver los comentarios; --wait espera, toma el siguiente y lo imprime
  srm look <id|--at seg> [dir]   guardar el cuadro (y un acercamiento del punto donde hicieron clic) como PNG para verlo
  srm done <id> [dir] --note …   marcar un comentario como hecho (el studio muestra la nota)
  srm fonts [add <familia> [dir]]   las tipografías incluidas, o instalar una en un proyecto
  srm vars [dir]                 las variables editables
  srm set clave=valor… [dir]     cambiar los valores por defecto de las variables en index.html
  srm scan [dir]                 mapa JSON de variables, objetos y escenas (para agentes)
  srm undo [dir]                 volver a la versión guardada anterior
  srm render [dir] [--format mp4|mov|webm|gif] [--fps 30]   exportar a <dir>/out/
  srm render [dir] --blur [n]     desenfoque de movimiento: n subcuadros promediados por cuadro (hasta 8 por defecto)
  srm render [dir] --silent       exportar sin el aviso de «no hay banda sonora»
  srm render [dir] [--workers n] [--video extract|seek] [--frames jpg|png]   navegadores a la vez (hasta 8), cómo se lee el video, el caché de cuadros
  srm check [dir] [--samples n] [--source] [--json]   antes de renderizar: estructura, scripts, archivos, reglas de movimiento y cuadros de muestra (texto cortado, tapado, con poco contraste o bajo los botones de las apps)
  srm qa [dir|video] [--loop]     revisar un render: saltos de un cuadro, tiempo muerto (sin contar las pausas OM.hold), cortes, curva de movimiento, el empalme del loop
  srm render [dir] --transparent  capa para CapCut/Premiere: ProRes 4444 con alfa (o --format webm), sin sonido
  srm fork <dir> <dir-nuevo> --size 1080x1920   copiar a otro tamaño de cuadro; la re-maquetación queda en la bandeja
  srm voice <dir> --text <guion.txt|"texto"> | --audio <archivo> [--voice ef_dora|win:Sabina|say:Paulina] [--speed 1.2] [--fit]   narración, palabras con tiempo, volumen para las bocas, .srt
  srm voice <dir> --audio toma.mp3 --words tiempos.json [--text guion]   la toma de un motor de voz con los tiempos que devolvió (ElevenLabs): palabras exactas, sin whisper
  srm voice --setup [whisper]     instalar la voz gratis Kokoro en un paso (~400 MB), o whisper para usar tu propia grabación
  srm sound [dir] [--list] [--off]   música y efectos de las escenas, golpes OM.sfx y om-score (srm render la actualiza)
  srm still <página.html|dir> [--at 0,2.5] [--out archivo.png|carpeta]   un PNG de cualquier página; varios tiempos → archivo-0.00s.png, archivo-2.50s.png
  srm swatch [direcciones.md] [--out archivo]   la paleta: las líneas de las tarjetas de dirección en un PNG, con revisión de contraste
  srm learn [temas…]             antes de un video: las preferencias de este creador y lo aprendido sobre esos temas
  srm learn harvest [dir]        después de un video: sus comentarios y cambios del studio, y qué vale la pena guardar
  srm learn add "…" --kind preference|observed|verified --topics a,b --evidence "…" [--do "…"]   guardar un hallazgo
  srm samples [build [ids…]]      el paquete de instrumentos reales (piano, cuerdas, batería…; CC0/CC-BY, ~55 MB): estado, o armarlo una vez
  srm share [dir] [--from s] [--to s]   después del render: un GIF de ≤10 MB (inicio + cuadro final) y share.md (texto para publicar)
  srm export html [dir] [--out carpeta] [--title …] [--desc …]   página para compartir (reproductor, prompt para remezclar, source.zip)
  srm doctor                     revisar Node, FFmpeg, el navegador y lo opcional (voces, whisper, el skill)
  srm kit [set clave=valor… | import <archivo>]   tu kit: handle, cta, colores, lang, platforms, voice, speed, character.* — cada proyecto nuevo arranca con él

Documentación: skills/short-reels-motion/SKILL.md   ·   English: SRM_LANG=en srm help`;

const HELP_EN = `Short Reels Motion ${VERSION} — shorts, reels and TikToks made by your coding agent, edited by pointing at the frame.
(also short-reels-motion; the engine's docs say om, which is the same command; built on huashu-motion by Huashu, MIT)

  srm grab <url|folder> [dir]   the product's real material into <dir>/materials/: page screenshots, logo, images, its colours and type (a URL), or the project's own screenshots, icons, media and stylesheet colours (a folder)
  srm new <dir> [--template t]   start a project (srm templates lists them)
  srm templates                  starter projects and what each is good for
  srm demo [dir]                 copy the showcase film and open it in the studio
  srm studio [dir] [--lang zh|en|es]   live preview, direct edits, comments for the agent (UI language; also OM_LANG)
  srm inbox [dir] [--wait]       list comments; --wait blocks, claims the next one and prints it
  srm look <id|--at sec> [dir]   save the frame (and a close-up of the clicked spot) as PNGs to look at
  srm done <id> [dir] --note …   mark a comment handled (the studio shows the note)
  srm fonts [add <family> [dir]] list the bundled typefaces, or install one into a project
  srm vars [dir]                 list editable variables
  srm set key=value… [dir]       change variable defaults in index.html
  srm scan [dir]                 JSON map of variables, objects and scenes (for agents)
  srm undo [dir]                 restore the previous saved version
  srm render [dir] [--format mp4|mov|webm|gif] [--fps 30]   export to <dir>/out/
  srm render [dir] --blur [n]     motion blur: n subframes averaged per frame (default up to 8; fast moves stop strobing)
  srm render [dir] --silent       export without the "no soundtrack" warning
  srm render [dir] [--workers n] [--video extract|seek] [--frames jpg|png]   browsers at once (default: up to 8), how footage is read, the footage cache
  srm check [dir] [--samples n] [--source] [--json]   before rendering: structure, scripts, files, motion rules, then sampled frames (cut-off, covered or low-contrast text, blank ends, history-dependent frames)
  srm qa [dir|video] [--loop]     check a render: single-frame pops, dead time (minus the film's OM.hold stretches), hard cuts, motion curve, loop seam
  srm render [dir] --transparent  overlay for CapCut/Premiere: ProRes 4444 with alpha (or --format webm), no sound
  srm fork <dir> <newdir> --size 1080x1920   copy into a new frame size; the re-layout lands in the inbox
  srm voice <dir> --text <file|"text"> | --audio <file> [--voice af_heart|ef_dora|win:Zira|say:Samantha] [--speed 1.2] [--fit]   narration, word cues, loudness for mouths, .srt
  srm voice <dir> --audio take.mp3 --words timestamps.json [--text script]   a voice engine's take with the times it returned (ElevenLabs): exact words, no whisper
  srm voice --setup [whisper]     set up the free Kokoro voice in one step (~400 MB), or whisper for your own recording
  srm sound [dir] [--list] [--off]   music + sound effects from the scenes, OM.sfx hits and an om-score (srm render refreshes it)
  srm still <page.html|dir> [--at 0,2.5] [--out file.png|folder]   a PNG of any page (key frames, treatment stills); several times → file-0.00s.png, file-2.50s.png
  srm swatch [directions.md] [--out file]   the Palette: lines of the direction cards as one PNG, with contrast and house-look checks
  srm learn [topics…]            before a film: this user's preferences + past experience on those topics
  srm learn harvest [dir]        after a film: its studio comments and edits, and what is worth keeping
  srm learn add "…" --kind preference|observed|verified --topics a,b --evidence "…" [--do "…"]   keep one finding
  srm samples [build [ids…]]      the real-instrument pack (piano, strings, drums…; CC0/CC-BY, ~55 MB): status, or build it once
  srm share [dir] [--from s] [--to s]   after a render: a ≤10 MB GIF (opening + end frame) and share.md (post, README header)
  srm export html [dir] [--out folder] [--title …] [--desc …]   share page (player, Remix prompt, source.zip) for any static host
  srm doctor                     check Node, FFmpeg and the renderer (and what is optional: voices, whisper, the skill)
  srm kit [set key=value… | import <file>]   the creator's kit: handle, cta, colours, lang, platforms, voice, speed, character.* — every new project starts with it

Docs: skills/short-reels-motion/SKILL.md   ·   en español: SRM_LANG=es srm help`;

function parse(argv) {
  const flags = {}, pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      if (v !== undefined) flags[k] = v;
      else if (argv[i + 1] && !argv[i + 1].startsWith('--')) flags[k] = argv[++i];
      else flags[k] = true;
    } else pos.push(a);
  }
  return { flags, pos };
}

const out = (x) => console.log(typeof x === 'string' ? x : JSON.stringify(x, null, 2));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function openBrowser(url) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  spawn(cmd, args, { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
}

function copyTemplate(from, dir) {
  const target = resolve(dir);
  // a folder that already holds research or assets is fine; one that already holds a film is not
  if (existsSync(join(target, 'index.html'))) throw new OmError(`${target} already has an index.html — pick a new folder (om never overwrites a project)`);
  cpSync(from, target, { recursive: true, force: false, errorOnExist: false, filter: (src) => !/[\\/](out|\.om|snapshots|template\.json)([\\/]|$)/.test(src.slice(from.length)) });
  return target;
}

// What the agent needs to act on a comment without opening the studio.
function describe(project, c) {
  const { html } = readSource(project);
  const lines = html.split('\n');
  const hits = c.target ? lines.map((l, i) => [i + 1, l]).filter(([, l]) => l.includes(`data-om-id="${c.target}"`) || l.includes(`data-om-id='${c.target}'`) || new RegExp(`OM\\.region\\(\\s*["']${c.target}["']`).test(l)) : [];
  const s = scan(html);
  const at = c.t != null ? `${c.t.toFixed(2)}s` : 'no time';
  return [
    `COMMENT ${c.id}  (${at}${c.scene ? `, scene "${c.scene}"` : ''}${c.target ? `, on #${c.target}` : ''}${c.x != null ? `, at x=${Math.round(c.x)} y=${Math.round(c.y)} of ${s.width}×${s.height}` : ''})`,
    `  “${c.text}”`,
    ...(c.thread || []).map((m) => m.who === 'agent' ? `  you replied: ${m.text}` : `  user, reopening: “${m.text}”  ← this is what to fix now`),
    hits.length ? `\nSOURCE ${project.index}\n` + hits.map(([n, l]) => `  ${n}: ${l.trim().slice(0, 200)}`).join('\n') : `\nSOURCE ${project.index}`,
    c.element ? `\nELEMENT\n  ${c.element.replace(/\s+/g, ' ').slice(0, 400)}` : '',
    s.variables.length ? `\nVARIABLES\n` + s.variables.map((v) => `  ${v.id} = ${JSON.stringify(v.value)}`).join('\n') : '',
    s.scenes.length ? `\nSCENES  ${s.scenes.map((x) => x.id).join(' → ')}` : '',
    `\nLOOK  srm look ${c.id} ${project.root}   (saves the frame and a close-up of the clicked spot)`,
    `\nNEXT  Edit index.html to do exactly this (keep everything else). The studio reloads on save.`,
    `      Then: srm done ${c.id} --note "<one line on what changed>"   (from ${project.root})`,
  ].filter(Boolean).join('\n');
}

async function main() {
  const [cmd = 'help', ...rest] = process.argv.slice(2);
  const { flags, pos } = parse(rest);

  switch (cmd) {
    case 'help': case '--help': case '-h': return out(cliLang() === 'es' ? HELP_ES : HELP_EN);
    case 'version': case '--version': case '-v': return out(VERSION);

    case 'new': {
      if (!pos[0]) throw new OmError('usage: srm new <dir>');
      const tpl = join(PKG, 'templates', flags.template || 'blank');
      if (!existsSync(join(tpl, 'index.html'))) throw new OmError(`no template "${flags.template}" — run \`srm templates\``);
      const dir = copyTemplate(tpl, pos[0]);
      // template.json "copy": {"<package path>": "<project path>"} pulls shared runtimes/fonts in, so
      // templates don't each carry their own copy in the repository.
      let meta = {};
      try { meta = JSON.parse(readFileSync(join(tpl, 'template.json'), 'utf8')); } catch {}
      for (const [from, to] of Object.entries(meta.copy || {})) cpSync(join(PKG, from), join(dir, to), { recursive: true });
      cpSync(join(PKG, 'runtime', 'om.js'), join(dir, 'vendor', 'om.js')); // OM.clock / OM.region / OM.cue, ready when needed
      // the creator's kit (srm kit): their handle, colours, language, narrator… on every new project
      let kitNote = '';
      if (!flags['no-kit']) {
        const { readKit, applyKit, kitFile } = await import('./lib/kit.js');
        const kit = readKit();
        if (Object.keys(kit).length) {
          const index = join(dir, 'index.html'), r = applyKit(readFileSync(index, 'utf8'), kit);
          if (r.applied.length) writeFileSync(index, r.html);
          kitNote = `\nkit     ${r.applied.length ? r.applied.join(', ') : 'nothing this template uses'} (${kitFile()})${r.skipped.length ? `\n        skipped: ${r.skipped.join('; ')}` : ''}`;
        }
      }
      return out(`created ${dir}${kitNote}\nnext: srm studio ${pos[0]}`);
    }

    case 'templates': {
      const root = join(PKG, 'templates');
      const list = readdirSync(root).filter((n) => existsSync(join(root, n, 'index.html'))).map((n) => {
        let meta = {};
        try { meta = JSON.parse(readFileSync(join(root, n, 'template.json'), 'utf8')); } catch {}
        return { id: n, ...meta };
      });
      if (flags.json) return out(list);
      // the column fits the longest name (short-antes-despues ran into its summary)
      const w = Math.max(...list.map((t) => t.id.length)) + 1, goodFor = tr({ es: 'sirve para', en: 'good for' });
      return out(list.map((t) => `${t.id.padEnd(w)} ${t.summary || ''}${t.best_for ? `\n${' '.repeat(w + 1)}${goodFor}: ${t.best_for.join(', ')}` : ''}`).join('\n'));
    }

    case 'demo': {
      const src = join(PKG, 'examples', 'showcase');
      if (!existsSync(src)) throw new OmError('this build has no showcase yet — try `srm new my-film`');
      const dir = copyTemplate(src, pos[0] || 'short-reels-motion-demo');
      process.stdout.write(`copied the showcase to ${dir}\n`);
      return studio(dir, flags);
    }

    case 'studio': return studio(pos[0] || '.', flags);

    case 'inbox': {
      const project = openProject(pos[0] || '.');
      if (!flags.wait) {
        const list = flags.all ? comments(project) : comments(project).filter((c) => c.status !== 'done' && c.status !== 'cancelled');
        if (flags.json) return out(list);
        if (!list.length) return out('inbox empty');
        return out(list.map((c) => `${c.id}  [${c.status}]  ${c.t != null ? c.t.toFixed(2) + 's  ' : ''}${c.target ? '#' + c.target + '  ' : ''}${c.text}`).join('\n'));
      }
      const deadline = flags.timeout ? Date.now() + Number(flags.timeout) * 1000 : Infinity;
      if (!flags.quiet) process.stderr.write(`waiting for comments on ${project.root} — open the studio and click the frame…\n`);
      for (;;) {
        const next = pending(project)[0];
        if (next) {
          snapshot(project, readSource(project).html, `before ${next.id}`); // undo returns to exactly this
          claim(project, next.id, flags.agent || 'agent');
          return out(flags.json ? next : describe(project, next));
        }
        if (Date.now() > deadline) { process.exitCode = 3; return out('no comments before timeout'); }
        await sleep(400);
      }
    }

    case 'look': {
      // pos[0] is a comment id or (with --at) the project dir
      const byComment = !flags.at;
      const project = openProject((byComment ? pos[1] : pos[0]) || '.');
      let t = Number(flags.at), x = null, y = null;
      if (byComment) {
        const c = comments(project).find((k) => k.id === pos[0]);
        if (!c) throw new OmError(`no comment ${pos[0]} — usage: srm look <comment-id> [dir]  or  srm look [dir] --at 2.5`);
        if (c.t == null) throw new OmError(`comment ${c.id} has no time`);
        ({ t, x, y } = c);
      }
      if (!Number.isFinite(t)) throw new OmError('need a time: --at <seconds>');
      const s = scan(readSource(project).html);
      const dir = join(project.om, 'look', `${byComment ? pos[0] : 't' + t.toFixed(2)}-${Date.now().toString(36)}`);
      mkdirSync(dir, { recursive: true });
      const { openFilm } = await import('./lib/capture.js');
      const film = await openFilm(project.index, { video: 'seek' }); // one browser: the same seek path as the render
      const shots = [];
      try {
        await film.seek(t);
        writeFileSync(join(dir, 'frame.png'), await film.shot());
        shots.push(join(dir, 'frame.png'));
        if (x != null && s.width) {
          const w = Math.round(s.width / 4), h = Math.round(s.height / 4);
          const zx = Math.max(0, Math.min(s.width - w, Math.round(x - w / 2))), zy = Math.max(0, Math.min(s.height - h, Math.round(y - h / 2)));
          writeFileSync(join(dir, 'zoom.png'), await film.shot({ clip: { x: zx, y: zy, width: w, height: h, scale: 2 } }));
          shots.push(`${join(dir, 'zoom.png')}   (close-up ${w}×${h} at 2x around x=${Math.round(x)} y=${Math.round(y)})`);
        }
      } finally { await film.close(); }
      return out(`frame at ${t.toFixed(2)}s — open these images to see what the user saw:\n` + shots.map((p) => '  ' + p).join('\n'));
    }

    case 'done': {
      if (!pos[0]) throw new OmError('usage: srm done <comment-id> [dir] --note "…"');
      const project = openProject(pos[1] || '.');
      snapshot(project, readSource(project).html, `after ${pos[0]}`);
      resolveComment(project, pos[0], flags.note === true ? '' : flags.note || '');
      return out(`done ${pos[0]}`);
    }

    case 'reopen': case 'cancel': {
      const project = openProject(pos[1] || '.');
      setStatus(project, pos[0], cmd, flags.note || '');
      return out(`${cmd} ${pos[0]}`);
    }

    case 'fonts': {
      const { families, addFamily } = await import('./lib/fonts.js');
      if (pos[0] === 'add') {
        if (!pos[1]) throw new OmError('usage: srm fonts add "<family>" [dir]');
        const r = addFamily(openProject(pos[2] || '.'), pos[1]);
        return out(`added ${r.family} (${r.faces.join(', ')}) — use font-family: "${r.family}"`);
      }
      return out(families().map((f) => `${f.family.padEnd(22)} ${f.faces.join(' ').padEnd(16)} ${f.note}`).join('\n'));
    }

    case 'vars': {
      const project = openProject(pos[0] || '.');
      const vars = readVariables(readSource(project).html);
      if (flags.json) return out(vars);
      return out(vars.length ? vars.map((v) => `${v.id.padEnd(18)} ${String(v.type).padEnd(7)} ${JSON.stringify(v.default)}   ${v.label || ''}`).join('\n') : 'no variables declared');
    }

    case 'set': {
      const pairs = pos.filter((p) => p.includes('='));
      const dir = pos.find((p) => !p.includes('=')) || '.';
      if (!pairs.length) throw new OmError('usage: srm set key=value [key=value…] [dir]');
      const project = openProject(dir);
      const { html, token } = readSource(project);
      const values = Object.fromEntries(pairs.map((p) => [p.slice(0, p.indexOf('=')), p.slice(p.indexOf('=') + 1)]));
      writeSource(project, setVariables(html, values), token, 'srm set ' + Object.keys(values).join(', '));
      return out(`set ${Object.keys(values).join(', ')}`);
    }

    case 'scan': return out(scan(readSource(openProject(pos[0] || '.')).html));

    case 'undo': {
      const r = undo(openProject(pos[0] || '.'));
      return out(`restored ${r.restored}`);
    }

    case 'render': {
      const project = openProject(pos[0] || '.');
      // The soundtrack is a function of the timeline: rebuild it so a retimed film never exports stale sound. It reads the
      // timeline from the first render browser; if it rewrites the <audio> tag, the browsers reload the film.
      const { declaresSound, hasSound, refreshRuntime, sound } = await import('./lib/sound.js');
      const log = (l) => process.stderr.write(l + '\n');
      refreshRuntime(project, log); // before the browsers load the film: the page lent to the sound must run the current runtime
      let prepare = null;
      const src = readSource(project).html;
      if (!flags.transparent && !flags.silent && (hasSound(src) || declaresSound(src))) {
        prepare = async (page) => { let rewrote = false; log((await sound(project, { page, onWrite: () => { rewrote = true; } }, log)).split('\n')[0]); return rewrote; };
      } else if (!flags.transparent && !flags.silent) log('warning  no soundtrack — run `srm sound` first (or pass --silent if the film is meant to be silent)');
      process.stderr.write('rendering in your Chrome…\n');
      const file = await render(project, { engine: flags.engine, prepare, video: flags.video === true ? undefined : flags.video, workers: flags.workers && Number(flags.workers), frameFormat: flags.frames === true ? undefined : flags.frames, tune: tuning(flags), allowPageErrors: !!flags['allow-page-errors'], format: flags.format, transparent: !!flags.transparent, blur: flags.blur === true ? true : flags.blur && Number(flags.blur), fps: flags.fps && Number(flags.fps), out: flags.out && resolve(flags.out), onLog: flags.verbose ? (l) => process.stderr.write(l + '\n') : () => {}, onNote: log, onWarn: (m) => process.stderr.write(`warning  ${m}\n`) });
      return out(file);
    }

    case 'check': {
      const { check, report } = await import('./lib/check.js');
      const project = openProject(pos[0] || '.');
      // check the film with the runtime it will be rendered with (render refreshes an old vendor/om.js too)
      (await import('./lib/sound.js')).refreshRuntime(project, (l) => process.stderr.write(l + '\n'));
      const found = await check(project, { page: !flags.source, samples: flags.samples ? Number(flags.samples) : 24, onLog: (l) => process.stderr.write(l + '\n') });
      if (found.some((f) => f.level === 'error')) process.exitCode = 1;
      return out(flags.json ? found : report(found, { root: project.root }));
    }

    case 'qa': {
      // srm qa [dir|video] [--loop]: checks the newest render of a project, or a given video file.
      const { qa, report, holdsOf } = await import('./lib/qa.js');
      let file = pos[0] || '.', project = null;
      if (!/\.(mp4|mov|webm)$/i.test(file)) {
        project = openProject(file);
        const dir = join(project.root, 'out');
        const vids = existsSync(dir) ? readdirSync(dir).filter((n) => /\.(mp4|webm|mov)$/i.test(n)).map((n) => join(dir, n)) : [];
        if (!vids.length) throw new OmError('nothing rendered yet — run `srm render` first, or pass a video file');
        file = vids.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
      } else if (basename(dirname(resolve(file))) === 'out' && existsSync(join(dirname(dirname(resolve(file))), 'index.html'))) {
        project = openProject(dirname(dirname(resolve(file))));   // a render in a project's out/: the film's holds apply
      }
      const h = project ? await holdsOf(project, resolve(file)) : { holds: [] };
      const r = qa(resolve(file), { loop: !!flags.loop, holds: h.holds });
      if (h.note) r.holdsNote = h.note;
      return out(flags.json ? r : report(r));
    }

    case 'fork': {
      if (!pos[0] || !pos[1] || !flags.size || flags.size === true) throw new OmError('usage: srm fork <dir> <newdir> --size 1080x1920');
      const { fork, parseSize } = await import('./lib/fork.js');
      const r = fork(pos[0], pos[1], parseSize(flags.size));
      return out(`forked ${r.from.width ?? '?'}×${r.from.height ?? '?'} → ${r.to.width}×${r.to.height}: ${r.project.root}\ninbox  ${r.comment.id} — re-lay it out for the new frame (srm inbox ${pos[1]} --wait picks it up)`);
    }

    case 'sound': {
      const { sound } = await import('./lib/sound.js');
      return out(await sound(flags.list ? null : openProject(pos[0] || '.'), flags, (l) => process.stderr.write(l + '\n')));
    }
    case 'still': {
      const { still } = await import('./lib/still.js');
      return out(await still(pos[0], { at: flags.at ?? null, out: flags.out || null }));
    }
    case 'swatch': {
      const { swatch } = await import('./lib/swatch.js');
      return out(await swatch(pos[0], { out: flags.out || null }));
    }
    case 'learn': {
      const L = await import('./lib/learn.js');
      if (pos[0] === 'harvest') return out(L.harvest(openProject(pos[1] || '.')));
      if (pos[0] === 'add') return out(L.addEntry({ text: pos.slice(1).join(' '), kind: flags.kind, topics: flags.topics, todo: flags.do, evidence: flags.evidence, project: flags.project }));
      if (pos[0] === 'status') return out(L.learnStatus());
      return out(L.recall(pos));
    }
    case 'samples': {
      const { loadPack, packDir, resetPack } = await import('./lib/samples.js');
      if (pos[0] === 'build') {
        const { buildSamples } = await import('./lib/samples-build.js');
        const r = await buildSamples({ only: pos.length > 1 ? pos.slice(1) : null, log: (l) => process.stderr.write(l + '\n') });
        resetPack();
        return out(r);
      }
      if (pos[0]) throw new OmError('usage: srm samples            show the installed pack\n       srm samples build [ids…]  download and build it (or rebuild some instruments)');
      const pack = loadPack();
      if (!pack) return out(`samples  none at ${packDir()} — music plays on synthesized instruments.\n         srm samples build   fetches the real-instrument pack once (piano, string sections, drum kits…)`);
      const ids = Object.keys(pack.instruments);
      return out(`samples  ${pack.dir}\n         ${ids.length} instruments: ${ids.join(' ')}\n         credits: ${pack.dir}/NOTICE.txt`);
    }
    case 'voice': {
      const { voice, setupKokoro, setupWhisper } = await import('./lib/voice.js');
      // srm voice --setup [kokoro|whisper|all]: what needs a one-time install, no project needed
      if (flags.setup) {
        const what = flags.setup === true ? 'kokoro' : String(flags.setup).toLowerCase();
        if (!['kokoro', 'whisper', 'all'].includes(what)) throw new OmError('usage: srm voice --setup [kokoro|whisper|all]   (kokoro: the free voice; whisper: your own recording, word by word)');
        const log = (l) => process.stderr.write(l + '\n'), done = [];
        if (what !== 'whisper') done.push(setupKokoro(log));
        if (what !== 'kokoro') {
          // `all` sets up what it can here: on macOS and Linux whisper comes from the system's package manager, so the
          // way to get it is reported next to the Kokoro that did install, not thrown over it
          try { done.push(await setupWhisper(log)); } catch (e) { if (what === 'whisper' || !(e instanceof OmError)) throw e; done.push(`· ${e.message}`); }
        }
        return out(done.join('\n'));
      }
      // the kit's voice and speed when no flag says otherwise: a generated voice (a script, or a voice engine's take with its
      // --words) gets the kit's speed; a recording keeps its own pace
      const { readKit } = await import('./lib/kit.js');
      const kit = readKit();
      if (!flags.voice && kit.voice && !flags.audio && !flags.words) { if (/^elevenlabs:/i.test(kit.voice)) process.stderr.write('kit voice is an ElevenLabs voice: generate the take there with its timestamps and pass both: --audio take.mp3 --words timestamps.json\n'); else flags.voice = kit.voice; }
      if (flags.speed == null && kit.speed && (!flags.audio || flags.words)) { flags.speed = kit.speed; flags.speedFrom = 'kit'; }
      const project = openProject(pos[0] || '.');
      (await import('./lib/sound.js')).refreshRuntime(project, (l) => process.stderr.write(l + '\n'));   // OM.env reads what voice measures
      return out(await voice(project, flags, (l) => process.stderr.write(l + '\n')));
    }

    case 'grab': {
      if (!pos[0]) throw new OmError('usage: srm grab <url|folder> [dir]   (dir: the film project, default .)');
      const { grab } = await import('./lib/grab.js');
      const root = resolve(pos[1] || '.');
      mkdirSync(root, { recursive: true });
      return out(await grab(root, pos[0], { maxShots: flags.shots ? Number(flags.shots) : 8 }));
    }
    case 'share': {
      const { share } = await import('./lib/share.js');
      return out(share(openProject(pos[0] || '.'), { from: flags.from ?? 0, to: flags.to ?? null, video: flags.video ? resolve(flags.video) : null }));
    }
    case 'export': {
      if (pos[0] !== 'html') throw new OmError('usage: srm export html [dir] [--out folder]   (video: srm render)');
      const { exportHtml } = await import('./lib/export.js');
      const r = exportHtml(openProject(pos[1] || '.'), { out: flags.out, title: flags.title, description: flags.desc });
      return out(`${r.dir}\n  index.html   open it, or put the folder on any static host (GitHub Pages, Vercel, npx serve)\n  source.zip   ${r.files.length} files — unzip and run srm studio ${r.name}`);
    }

    case 'doctor': return doctor();

    case 'kit': {
      const { readKit, setKit, importKit, kitFile, KEYS, CHARACTER } = await import('./lib/kit.js');
      const sub = pos[0];
      if (sub === 'set') {
        const pairs = Object.fromEntries(pos.slice(1).filter((p) => p.includes('=')).map((p) => [p.slice(0, p.indexOf('=')), p.slice(p.indexOf('=') + 1)]));
        if (!Object.keys(pairs).length) throw new OmError('usage: srm kit set key=value [key=value…]  (an empty value removes the key)');
        setKit(pairs);
        return out(`kit: ${Object.keys(pairs).join(', ')} → ${kitFile()}`);
      }
      if (sub === 'import') {
        if (!pos[1]) throw new OmError('usage: srm kit import <kit.json>');
        const kit = importKit(resolve(pos[1]));
        return out(`kit imported → ${kitFile()}\n${JSON.stringify(kit, null, 2)}`);
      }
      if (sub) throw new OmError('usage: srm kit · srm kit set key=value… · srm kit import <file>');
      const kit = readKit();
      if (!Object.keys(kit).length) return out(`${tr({ es: 'todavía no hay kit', en: 'no kit yet' })} (${kitFile()})\nsrm kit set handle=${tr({ es: '@tu_usuario', en: '@your_handle' })} accent=#E4007C cta="SÍGUEME PARA MÁS" lang=es-MX\n${tr({ es: 'claves', en: 'keys' })}: ${Object.keys(KEYS).join(', ')}, character.<${CHARACTER.join('|')}>`);
      return out(`${kitFile()}\n${JSON.stringify(kit, null, 2)}`);
    }

    default: throw new OmError(`${tr({ es: 'comando desconocido', en: 'unknown command' })} "${cmd}"\n\n${cliLang() === 'es' ? HELP_ES : HELP_EN}`);
  }
}

// Rendering knobs for measuring (not in --help): --shot png|jpeg  --paint 0|1|2  --chunk n  --preset x  --crf n
const tuning = (f) => ({ ...(f.shot && f.shot !== true ? { shotFormat: f.shot } : {}), ...(f.paint != null && f.paint !== true ? { paintWaits: Number(f.paint) } : {}), ...(f.chunk ? { chunk: Number(f.chunk) } : {}), ...(f.preset ? { preset: f.preset } : {}), ...(f.crf ? { crf: Number(f.crf) } : {}), ...(f.software ? { software: true } : {}) });

async function studio(dir, flags) {
  const { startStudio } = await import('./lib/server.js');
  const project = openProject(dir);
  const port = Number(flags.port || 4848);
  let started;
  for (let p = port; p < port + 20 && !started; p++) {
    try { started = await startStudio(project, { port: p, lang: flags.lang }); }
    catch (e) { if (e.code !== 'EADDRINUSE') throw e; }
  }
  if (!started) throw new OmError(`no free port from ${port}`);
  out(`studio  ${started.url}\nproject ${project.root}\n\nAgent loop: srm inbox ${dir === '.' ? '' : dir + ' '}--wait   (Ctrl-C to stop the studio)`);
  if (!flags['no-open']) openBrowser(started.url);
  await new Promise(() => {});
}

async function doctor() {
  const { kokoroPython, kokoroReady, powershellEnv, sapiVoices, whisperCli, WHISPER_HINT } = await import('./lib/voice.js');
  const win = process.platform === 'win32', report = [];
  const major = Number(process.versions.node.split('.')[0]);
  report.push([major >= 22, `Node ${process.versions.node}`, major >= 22 ? '' : tr({ es: 'se necesita Node 22 o más nuevo — https://nodejs.org', en: 'need Node 22 or newer — https://nodejs.org' })]);
  const has = (bin) => spawnSync(win ? 'where' : 'which', [bin], { stdio: 'ignore' }).status === 0;
  const ff = (args) => spawnSync('ffmpeg', ['-hide_banner', ...args], { encoding: 'utf8' }).stdout || '';
  const hasFf = has('ffmpeg') && has('ffprobe');
  report.push([hasFf, tr({ es: 'FFmpeg + ffprobe (render, sonido, qa)', en: 'FFmpeg + ffprobe (render, sound, qa)' }), { win32: 'winget install Gyan.FFmpeg', darwin: 'brew install ffmpeg' }[process.platform] || 'apt install ffmpeg']);
  if (hasFf) {
    const enc = ff(['-encoders']);
    const missing = ['libx264', 'prores_ks', 'libvpx-vp9', 'libopus'].filter((e) => !enc.includes(e));
    report.push([!missing.includes('libx264'), `encoders ${missing.length ? `${tr({ es: 'faltan', en: 'missing' })} ${missing.join(', ')}` : 'mp4 · mov · webm · gif'}`, missing.length ? tr({ es: 'mp4 necesita libx264; mov, prores_ks; webm, libvpx-vp9 y libopus — un FFmpeg completo los trae todos', en: 'mp4 needs libx264; mov needs prores_ks; webm needs libvpx-vp9 and libopus — a full FFmpeg build has them all' }) : '']);
  }
  const browser = findChrome();
  report.push([!!browser, browser ? `Chrome ${chromeVersion(browser) || ''} (${browser})`.replace('  ', ' ') : tr({ es: 'Chrome (vista previa, render, cuadros, sonido)', en: 'Chrome (preview, render, stills, sound)' }), browser ? '' : NO_CHROME]);
  // optional: not needed to make a short, but each one opens a way of working (· = not there yet)
  const home = homedir();
  const optional = [
    // a venv that cannot import kokoro-onnx is a setup that stopped halfway: srm voice --setup completes it
    kokoroPython() && !kokoroReady()
      ? [false, tr({ es: 'Kokoro (a medias: falta kokoro-onnx en su venv)', en: 'Kokoro (half set up: its venv lacks kokoro-onnx)' }), tr({ es: 'srm voice --setup lo completa', en: 'srm voice --setup completes it' })]
      : [!!kokoroPython(), tr({ es: 'Kokoro (voz gratis, mejor que la del sistema)', en: 'Kokoro (free voice, better than the system one)' }), tr({ es: 'srm voice --setup (una vez, ~400 MB)', en: 'srm voice --setup (once, ~400 MB)' })],
  ];
  if (win) {
    // Windows' own voices: the free voice with nothing to install (srm voice --voice win), and the fallback without Kokoro
    // fine when there is one in the creator's language (the CLI's: SRM_LANG, the kit, the system), not only in Spanish
    const voices = sapiVoices(), mine = cliLang(), theirs = voices.filter((v) => v.culture.toLowerCase().startsWith(mine + '-'));
    optional.push([theirs.length > 0, `${tr({ es: 'voces de Windows', en: 'Windows voices' })}: ${voices.length ? voices.map((v) => `${v.name.replace(/^Microsoft | Desktop$/g, '')} (${v.culture})`).join(', ') : voices.error ? tr({ es: `no se pudieron leer (${voices.error})`, en: `could not be read (${voices.error})` }) : tr({ es: 'ninguna', en: 'none' })}`,
      mine === 'es' ? tr({ es: 'para una voz en español: Configuración → Hora e idioma → Voz → Agregar voces → Español (México)', en: 'for a Spanish voice: Settings → Time & language → Speech → Add voices → Spanish (Mexico)' })
        : tr({ es: 'para una voz en inglés: Configuración → Hora e idioma → Voz → Agregar voces → English (United States)', en: 'for an English voice: Settings → Time & language → Speech → Add voices → English (United States)' })]);
  }
  const whisper = whisperCli();
  optional.push([!!whisper, tr({ es: 'whisper (tu propia grabación como voz, palabra por palabra)', en: 'whisper (your own recording as the voice, word by word)' }), WHISPER_HINT[process.platform] || WHISPER_HINT.linux]);
  optional.push([existsSync(join(home, '.claude', 'skills', 'short-reels-motion')), tr({ es: 'skill para Claude Code', en: 'skill for Claude Code' }) + ' (~/.claude/skills/short-reels-motion)', tr({ es: 'corre el instalador, o enlaza ahí skills/short-reels-motion', en: 'run the installer, or link skills/short-reels-motion there' })]);
  optional.push([existsSync(join(home, '.codex', 'skills', 'short-reels-motion')), tr({ es: 'skill para Codex', en: 'skill for Codex' }) + ' (~/.codex/skills/short-reels-motion)', tr({ es: 'solo si usas Codex: corre el instalador', en: 'only if you use Codex: run the installer' })]);
  // another program called srm (the old secure-delete tool) earlier on PATH would run instead of this one
  const which = (spawnSync(win ? 'where' : 'which', ['srm'], { encoding: 'utf8' }).stdout || '').split(/\r?\n/)[0].trim();   // no `which` at all: nothing found
  let ours = !which;
  try { ours = !which || realpathSync(which).startsWith(realpathSync(PKG)) || readFileSync(which, 'utf8').includes('short-reels-motion'); } catch { /* not readable */ }
  if (!ours) report.push([false, tr({ es: `otro programa responde a «srm» (${which})`, en: `another program answers to "srm" (${which})` }), tr({ es: 'usa `short-reels-motion`, o pon primero en el PATH la carpeta global de npm', en: 'use `short-reels-motion` instead, or put the npm global bin first on PATH' })]);
  // Windows PowerShell runs npm's srm.ps1 only when scripts are allowed (a new Windows has them Restricted)
  if (win) {
    const policy = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'Get-ExecutionPolicy'], { encoding: 'utf8', env: powershellEnv(), windowsHide: true }).stdout?.trim();
    if (/^(Restricted|AllSigned)$/i.test(policy || '')) optional.push([false, tr({ es: `PowerShell no deja correr srm.ps1 (ExecutionPolicy ${policy})`, en: `PowerShell will not run srm.ps1 (ExecutionPolicy ${policy})` }), tr({ es: 'Set-ExecutionPolicy -Scope CurrentUser RemoteSigned   (o usa srm desde cmd o Git Bash)', en: 'Set-ExecutionPolicy -Scope CurrentUser RemoteSigned   (or run srm from cmd or Git Bash)' })]);
  }
  const optionalWord = tr({ es: 'opcional', en: 'optional' });
  out([...report.map(([ok, what, hint]) => `${ok ? '✓' : '✗'} ${what}${hint && !ok ? `  — ${hint}` : ''}`),
    ...optional.map(([ok, what, hint]) => `${ok ? '✓' : '·'} ${what}${hint && !ok ? `  — ${optionalWord}: ${hint}` : ''}`)].join('\n'));
  if (report.some(([ok]) => !ok)) process.exitCode = 2;
}

main().catch((e) => {
  if (e instanceof OmError) { console.error(`srm: ${e.message}`); process.exitCode = 1; }
  else { console.error(e); process.exitCode = 1; }
});
