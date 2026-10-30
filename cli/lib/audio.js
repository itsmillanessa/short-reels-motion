// The film's sound track: whatever the composition declares as audio, put under the picture with as little
// processing as possible. One track that starts at 0 is wrapped as it is — no filter touches it, so the
// film is exactly as loud as the file (a mix filter that averages its inputs would make it quieter).
// Several tracks are placed with adelay/atrim/volume and summed without normalising.
import { spawn, spawnSync } from 'node:child_process';
import { OmError } from './project.js';

const ff = (args) => spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], { encoding: 'utf8', maxBuffer: 64 << 20 });
const r3 = (n) => Math.round(n * 1000) / 1000;

// Integrated loudness (LUFS) and true peak (dBTP) of the first audio stream; null when there is none.
export function loudness(file) {
  const r = spawnSync('ffmpeg', ['-nostats', '-hide_banner', '-i', file, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 64 << 20 });
  const tail = (r.stderr || '').split('Summary:').pop();
  const I = /\bI:\s+(-?[\d.]+|-inf)\s+LUFS/.exec(tail)?.[1];
  const P = /Peak:\s+(-?[\d.]+|-inf)\s+dBFS/.exec(tail)?.[1];
  if (I == null || I === '-inf') return null;
  return { lufs: Number(I), peak: P == null ? null : Number(P) };
}

export const hasAudio = (file) => spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', file], { encoding: 'utf8' }).stdout.trim() === 'audio';

const amixNormalizes = () => /normalize/.test(spawnSync('ffmpeg', ['-hide_banner', '-h', 'filter=amix'], { encoding: 'utf8' }).stdout || '');

// How ffmpeg reads the tracks: the inputs and either the one stream as it is (mode 'direct') or a filter graph that
// places and sums them (mode 'mix'). `first` is the input index of the first track.
// tracks: [{ file, start, duration, mediaStart, rate, volume }] (seconds; duration may be Infinity)
// ffmpeg's atempo takes 0.5–2 per instance (older builds): chained for any speed (a script's 0.3–3, a clip's playback rate).
export function atempo(speed) {
  const f = [];
  let s = speed;
  while (s > 2) { f.push('atempo=2'); s /= 2; }
  while (s < 0.5) { f.push('atempo=0.5'); s /= 0.5; }
  f.push(`atempo=${Math.round(s * 1000) / 1000}`);
  return f.join(',');
}

function placeTracks(tracks, duration, first) {
  const plain = (t) => t.start === 0 && !t.mediaStart && (t.rate || 1) === 1 && (t.volume ?? 1) === 1;
  const limit = (t) => (Number.isFinite(t.duration) ? Math.min(t.duration, duration) : duration);
  const inputs = tracks.flatMap((t) => ['-i', t.file]);
  if (tracks.length === 1 && plain(tracks[0])) return { mode: 'direct', inputs, map: ['-map', `${first}:a:0`], length: r3(limit(tracks[0])) };
  const parts = tracks.map((t, i) => {
    const f = [];
    const rate = t.rate || 1;
    f.push(`atrim=start=${r3(t.mediaStart || 0)}${Number.isFinite(t.duration) ? `:end=${r3((t.mediaStart || 0) + t.duration * rate)}` : ''}`, 'asetpts=PTS-STARTPTS');
    if (rate !== 1) f.push(atempo(rate));
    if ((t.volume ?? 1) !== 1) f.push(`volume=${t.volume}`);
    if (t.start > 0) f.push(`adelay=${Math.round(t.start * 1000)}:all=1`);
    return `[${i + first}:a:0]${f.join(',')}[a${i}]`;
  });
  const n = tracks.length;
  const sum = amixNormalizes() ? `amix=inputs=${n}:duration=longest:dropout_transition=0:normalize=0` : `amix=inputs=${n}:duration=longest:dropout_transition=0,volume=${n}`;
  const graph = `${parts.join(';')};${tracks.map((_, i) => `[a${i}]`).join('')}${sum},alimiter=limit=0.98[aout]`;
  return { mode: 'mix', inputs, map: ['-filter_complex', graph, '-map', '[aout]'], length: r3(duration) };
}

// Where the feeds normalise: TikTok, Reels and Shorts all play at about -14 LUFS. A narrated film is the voice plus the
// soundtrack summed here, so nothing upstream sets its level; left alone it lands wherever the recording was (often -17).
export const FEED_LUFS = -14;
const TRUE_PEAK = 0.84; // -1.5 dBFS, headroom for the AAC encoder

const run = (args) => new Promise((ok, fail) => {
  const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = '';
  child.stderr.on('data', (b) => { err += b; });
  child.on('error', (e) => fail(new OmError(`could not start ffmpeg: ${e.message}`)));
  child.on('close', (code) => (code === 0 ? ok(err) : fail(new OmError(`could not encode the sound: ${err.trim().split('\n').pop()}`))));
});

// The mix with one linear gain so it reads `lufs` integrated, then a true limiter (no auto level) for the peaks.
// Measured on the summed graph first, so the gain is exact and the dynamics stay as they were.
async function levelled(t, lufs) {
  const graph = t.map[1].replace(/,alimiter=limit=0\.98\[aout\]$/, '');
  const probe = await run(['-nostats', '-hide_banner', ...t.inputs, '-filter_complex', `${graph},ebur128[aout]`, '-map', '[aout]', '-t', String(t.length), '-f', 'null', '-']);
  const I = /\bI:\s+(-?[\d.]+)\s+LUFS/.exec(probe.split('Summary:').pop())?.[1];
  if (I == null) return { ...t, gain: 0 };
  const gain = r3(lufs - Number(I));
  return { ...t, gain, map: ['-filter_complex', `${graph},volume=${gain}dB,alimiter=limit=${TRUE_PEAK}:level=false[aout]`, '-map', '[aout]'] };
}

// Writes `out` (video stream copied from `video`) and returns { mode: 'direct' | 'mix' | 'none', tracks }.
export function muxAudio(video, tracks, out, { duration, bitrate = '256k' } = {}) {
  tracks = tracks.filter((t) => t.file);
  if (!tracks.length) {
    const r = ff(['-i', video, '-map', '0:v', '-c:v', 'copy', '-t', String(duration), out]);
    if (r.status !== 0) throw new OmError(`could not finish the video: ${r.stderr.trim().split('\n').pop()}`);
    return { mode: 'none', tracks: 0 };
  }
  const t = placeTracks(tracks, duration, 1);
  const r = ff(['-i', video, ...t.inputs, '-map', '0:v', ...t.map, '-c:v', 'copy', '-c:a', 'aac', '-b:a', bitrate, '-ar', '48000', '-t', String(t.length), out]);
  if (r.status !== 0) throw new OmError(`could not put the sound under the picture: ${r.stderr.trim().split('\n').pop()}`);
  return { mode: t.mode, tracks: tracks.length };
}

// The sound track on its own, encoded while the picture is still rendering (the renderer then only copies streams).
// codec: ffmpeg audio codec arguments for the target container. Resolves to { mode, tracks } ('none' writes nothing).
// lufs: level a mix to this integrated loudness (narrated films pass FEED_LUFS); null keeps the plain sum.
export async function encodeAudio(tracks, out, { duration, codec = ['-c:a', 'aac', '-b:a', '256k', '-ar', '48000'], lufs = null } = {}) {
  tracks = tracks.filter((t) => t.file);
  if (!tracks.length) return { mode: 'none', tracks: 0 };
  let t = placeTracks(tracks, duration, 0);
  if (lufs != null && t.mode === 'mix') t = await levelled(t, lufs);
  await run(['-v', 'error', '-y', ...t.inputs, ...t.map, '-vn', ...codec, '-t', String(t.length), out]);
  return { mode: t.mode, tracks: tracks.length, ...(t.gain != null && { gain: t.gain }) };
}

// After the mux: a single wrapped file must come out as loud as it went in (AAC moves it by hundredths of a dB).
export function checkLoudness(out, sources, { tolerance = 0.5 } = {}) {
  const got = loudness(out);
  const want = sources.length === 1 ? loudness(sources[0]) : null;
  const res = { lufs: got?.lufs ?? null, peak: got?.peak ?? null, source: want?.lufs ?? null };
  if (got && want && Math.abs(got.lufs - want.lufs) > tolerance) {
    throw new OmError(`the film's sound is ${got.lufs.toFixed(1)} LUFS but its source is ${want.lufs.toFixed(1)} LUFS (more than ${tolerance} LU apart)`);
  }
  return res;
}
