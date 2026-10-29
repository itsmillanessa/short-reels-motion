import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  splitSentences, tokenize, weight, placeWords, placeSentence, wordsOf, parseSilences, speechIntervals,
  sentenceSpans, alignChars, charTimes, asrChars, captionLines, toSrt, cueTerms, cueMatches, missingCues, repeatedCues, applyVoice, pickVoice, isSpanish, recordingLang,
  engineTimes, placeExact, levels, voice,
} from '../cli/lib/voice.js';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openProject } from '../cli/lib/project.js';

const SCRIPT = 'huashu-motion，一句话出片。你只要说出想法，Agent就把画面做出来。\n哪里不满意，指着画面改，它当场重做！改完一键导出，配音和字幕都对齐。';

const monotonic = (words, from, to) => {
  let last = from;
  for (const w of words) {
    assert.ok(w.start >= last - 1e-9, `${w.word} starts ${w.start} before ${last}`);
    assert.ok(w.end >= w.start, `${w.word} ends before it starts`);
    assert.ok(w.end <= to + 1e-9, `${w.word} ends ${w.end} after ${to}`);
    last = w.end;
  }
};

test('splitSentences cuts at 。！？；, newlines and English full stops, keeps punctuation', () => {
  assert.deepEqual(splitSentences(SCRIPT), [
    'huashu-motion，一句话出片。', '你只要说出想法，Agent就把画面做出来。', '哪里不满意，指着画面改，它当场重做！', '改完一键导出，配音和字幕都对齐。',
  ]);
  assert.deepEqual(splitSentences('It costs 3.5 dollars. Fine?\n“好。”然后\n\n。'), ['It costs 3.5 dollars.', 'Fine?', '“好。”', '然后']);
});

test('tokenize keeps Latin runs and cue terms whole, words are Intl.Segmenter words', () => {
  const words = (s, keep) => tokenize(s, keep).filter((t) => t.word).map((t) => t.text);
  assert.deepEqual(words('huashu-motion，一句话出片。', ['一句话']), ['huashu-motion', '一句话', '出', '片']);
  assert.ok(words('把 GPT-5 的成本降低 30%，只要 3.5 秒').includes('GPT-5'));
  assert.ok(words('把 GPT-5 的成本降低 30%，只要 3.5 秒').includes('3.5'));
  // ICU splits 缓存命中 as 缓|存命|中; a cue term repairs it.
  assert.ok(!words('缓存命中之后').includes('缓存'));
  assert.ok(words('缓存命中之后', ['缓存']).includes('缓存'));
  assert.equal(tokenize('画面', []).map((t) => t.text).join(''), '画面');
});

test('weights: Han characters and digits count one, Latin by vowel groups, punctuation a sliver', () => {
  assert.equal(weight({ text: '画面', word: true }), 2);
  assert.equal(weight({ text: 'Agent', word: true }), 2);
  assert.equal(weight({ text: '30', word: true }), 2);
  assert.equal(weight({ text: '，', word: false }), 0.1);
  assert.equal(weight({ text: ' ', word: false }), 0);
});

test('placeWords: monotonic, inside the spans, never inside a silence, last word ends at speech end', () => {
  const spans = [[0.2, 1.0], [1.6, 2.4]];
  const placed = placeWords(tokenize('你只要说出想法，Agent就把画面做出来。'), spans);
  const words = placed.filter((t) => t.word).map((t) => ({ word: t.text, ...t }));
  monotonic(words, 0.2, 2.4);
  assert.equal(words[0].start, 0.2);
  for (const w of words) assert.ok(!(w.start > 1.0 && w.start < 1.6), `${w.word} starts inside the pause`);
});

test('placeSentence snaps a comma onto the pause inside the sentence', () => {
  const placed = placeSentence(tokenize('huashu-motion，一句话出片。', ['一句话']), [[0, 1], [1.4, 2]]);
  const by = Object.fromEntries(placed.filter((t) => t.word).map((t) => [t.text, t]));
  assert.equal(by['huashu-motion'].end, 1);
  assert.equal(by['一句话'].start, 1.4);
  assert.equal(by['片'].end, 2);
});

test('silencedetect parsing and its complement', () => {
  const log = '[silencedetect @ 0x1] silence_start: 1.2\n[silencedetect @ 0x1] silence_end: 1.5 | silence_duration: 0.3\n[silencedetect] silence_start: 3.9';
  const sil = parseSilences(log, 4.2);
  assert.deepEqual(sil, [[1.2, 1.5], [3.9, 4.2]]);
  assert.deepEqual(speechIntervals(sil, 4.2), [[0, 1.2], [1.5, 3.9]]);
  assert.deepEqual(speechIntervals([], 2), [[0, 2]]);
});

test('sentenceSpans puts sentence edges on the pauses nearest to where the text weights predict', () => {
  // three sentences of equal weight; speech has a short comma pause and two long sentence pauses
  const intervals = [[0, 1], [1.1, 2], [2.6, 3.4], [3.5, 4.4], [5, 6]];
  const spans = sentenceSpans([5, 4, 3], intervals);
  assert.equal(spans.length, 3);
  assert.deepEqual(spans[0].at(-1), [1.1, 2]);
  assert.deepEqual(spans[1][0], [2.6, 3.4]);
  assert.deepEqual(spans[2], [[5, 6]]);
});

test('alignChars and charTimes survive substitutions from ASR', () => {
  const script = [...'改完一键导出'];
  const heard = [...'改完意见导出'].map((ch, i) => ({ ch, start: i * 0.2, end: i * 0.2 + 0.15 }));
  const m = alignChars(script, heard.map((c) => c.ch));
  assert.deepEqual(m, [0, 1, -1, -1, 4, 5]);
  const { times, matched } = charTimes(script, heard);
  assert.equal(matched, 4 / 6);
  assert.equal(times[4].start, 0.8);
  assert.ok(times[2].start >= times[1].end && times[3].end <= times[4].start);
});

test('asrChars reads whisper.cpp full JSON and skips special tokens', () => {
  const json = { transcription: [{ text: '指着画面', offsets: { from: 0, to: 1000 }, tokens: [
    { text: '[_BEG_]', offsets: { from: 0, to: 0 } }, { text: '指', offsets: { from: 0, to: 200 } },
    { text: '着画', offsets: { from: 200, to: 600 } }, { text: '面', offsets: { from: 600, to: 1000 } }] }] };
  const cs = asrChars(json);
  assert.deepEqual(cs.map((c) => c.ch).join(''), '指着画面');
  assert.equal(cs[2].start, 0.4);
});

test('captions: ≤16 visible characters, cut at commas, never across sentences', () => {
  const long = 'huashu-motion的编辑器会把你指着的那个对象、所在的分镜和当前时间一起发给Agent，它改完之后画面会自动刷新。';
  const sentences = splitSentences(SCRIPT + long).map((s, i) => ({ text: s, tokens: placeSentence(tokenize(s), [[i * 5, i * 5 + 4]]) }));
  const lines = sentences.flatMap((s) => captionLines(s, 16));
  for (const l of lines) {
    const width = [...l.text].reduce((n, c) => n + (/[\p{L}\p{N}]/u.test(c) ? (/[\x00-\x7f]/.test(c) ? 0.5 : 1) : 0), 0);
    assert.ok(width <= 16, `"${l.text}" is ${width} wide`);
    assert.ok(!/[。，]$/.test(l.text));
  }
  // every line sits inside one sentence's time range
  for (const l of lines) assert.ok(sentences.some((s, i) => l.start >= i * 5 && l.end <= i * 5 + 4));
  const srt = toSrt(sentences);
  assert.match(srt, /^1\n00:00:00,000 --> 00:00:0\d,\d{3}\n/);
  assert.equal(srt.split('\n\n').length, lines.length);
});

test('cueTerms and missingCues mirror OM.cue', () => {
  const html = `tl.to(a, {}, OM.cue('一句话') - 0.2); tl.to(b, {}, OM.cue("画面", 2)); OM.cue(\`导出\`, 1, 'end'); OM.cue('缺席')`;
  assert.deepEqual(cueTerms(html), [{ term: '一句话', nth: 1, explicit: false }, { term: '画面', nth: 2, explicit: true }, { term: '导出', nth: 1, explicit: true }, { term: '缺席', nth: 1, explicit: false }]);
  const words = [{ word: '一句话' }, { word: '画面' }, { word: '导出' }];
  assert.deepEqual(missingCues(words, cueTerms(html)).map((m) => m.term), ['画面', '缺席']);
});

test('cue matching: whole words in Spanish, substring fallback only for CJK', () => {
  const es = [{ word: 'Treinta' }, { word: 'segundos,' }, { word: 'Dos' }, { word: 'cosas.' }, { word: 'cosa' }, { word: 'número' }, { word: 'uno' }];
  assert.deepEqual(cueMatches(es, 'dos').map((w) => w.word), ['Dos']);           // not "segundos"
  assert.deepEqual(cueMatches(es, 'cosa').map((w) => w.word), ['cosa']);         // not "cosas."
  assert.deepEqual(cueMatches(es, 'segundos').map((w) => w.word), ['segundos,']); // punctuation ignored
  assert.deepEqual(cueMatches(es, 'gund'), []);                                   // no substring in Latin text
  const zh = [{ word: '这个缓存' }, { word: '画面' }];
  assert.deepEqual(cueMatches(zh, '缓存').map((w) => w.word), ['这个缓存']);       // CJK keeps the fallback
  assert.deepEqual(cueMatches(zh, '画面').map((w) => w.word), ['画面']);
});

const HTML = `<!doctype html>
<html lang="zh" data-composition-variables='[{"id":"t","type":"string","label":"t","default":"x"}]'>
<head><meta charset="utf-8"><script src="vendor/gsap.min.js"></script></head>
<body>
<div id="film" data-composition-id="film" data-width="1920" data-height="1080" data-duration="8">
  <h1>hi</h1>
</div>
<script>const t = OM.cue('画面');</script>
</body></html>
`;

const SENTENCES = [{ text: '指着画面改。', tokens: placeSentence(tokenize('指着画面改。'), [[0.1, 1.2]]) }];

test('applyVoice inserts audio + cues once and is idempotent', () => {
  const a = applyVoice(HTML, { src: 'assets/voice.wav', duration: 9.27, sentences: SENTENCES, meta: { precision: 'tts' } });
  const b = applyVoice(a.html, { src: 'assets/voice.wav', duration: 9.27, sentences: SENTENCES, meta: { precision: 'tts' } });
  assert.equal(b.html, a.html);
  assert.equal(a.html.match(/<audio/g).length, 1);
  assert.equal(a.html.match(/id="om-cues"/g).length, 1);
  assert.match(a.html, /<audio id="om-voice" src="assets\/voice.wav" data-start="0" data-duration="9.27" data-track-index="\d+" data-volume="1"><\/audio>/);
  assert.ok(!/crossorigin/.test(a.html));
  // cues sit before the scripts that read them, and inside the root comes the audio
  assert.ok(a.html.indexOf('om-cues') < a.html.indexOf("OM.cue('画面')"));
  assert.ok(a.html.indexOf('om-voice') > a.html.indexOf('data-composition-id'));
  const cues = JSON.parse(/<script type="application\/json" id="om-cues">([\s\S]*?)<\/script>/.exec(a.html)[1]);
  assert.deepEqual(cues.words.map((w) => w.word), ['指', '着', '画面', '改']);
  assert.equal(cues.precision, 'tts');
  // the composition is shorter than the voice: reported, not changed
  assert.equal(a.rootDuration, 8);
  assert.equal(a.newDuration, 8);
  assert.match(a.html, /data-duration="8"/);
});

test('applyVoice keeps the user\'s data-start/volume, shifts cues by data-start, and --fit extends the root', () => {
  const a = applyVoice(HTML, { src: 'assets/voice.wav', duration: 9.27, sentences: SENTENCES });
  const tweaked = a.html.replace('data-start="0"', 'data-start="1.5"').replace('data-volume="1"', 'data-volume="0.8"');
  const b = applyVoice(tweaked, { src: 'assets/voice.wav', duration: 9.27, sentences: SENTENCES, fit: true });
  assert.match(b.html, /data-start="1.5"/);
  assert.match(b.html, /data-volume="0.8"/);
  assert.equal(b.words[0].start, 1.6);
  assert.equal(b.newDuration, 11.3); // 1.5 + 9.27 + 0.5, rounded up to 0.1
  assert.match(b.html, /data-composition-id="film" data-width="1920" data-height="1080" data-duration="11.3"/);
  const c = applyVoice(b.html, { src: 'assets/voice.wav', duration: 2, sentences: SENTENCES, fit: true });
  assert.equal(c.newDuration, 11.3); // --fit never shortens
});

test('applyVoice escapes </script> inside cue words', () => {
  const s = [{ text: 'x', tokens: [{ text: '</script>', word: true, start: 0, end: 1 }] }];
  const a = applyVoice(HTML, { src: 'assets/voice.wav', duration: 1, sentences: s });
  assert.equal(a.html.match(/<\/script>/g).length, HTML.match(/<\/script>/g).length + 1);
});

test('default voice: Chinese on macOS uses say:Tingting, elsewhere Kokoro', () => {
  assert.deepEqual(pickVoice(undefined, '你好', 'darwin'), { engine: 'say', id: 'Tingting' });
  assert.deepEqual(pickVoice(undefined, '你好', 'linux'), { engine: 'kokoro', id: 'zf_xiaobei' });
  assert.deepEqual(pickVoice(undefined, 'hello', 'darwin'), { engine: 'kokoro', id: 'af_heart' });
  assert.deepEqual(pickVoice('say:Meijia', '你好'), { engine: 'say', id: 'Meijia' });
  assert.deepEqual(pickVoice('zf_xiaobei', '你好'), { engine: 'kokoro', id: 'zf_xiaobei' });
});

test('default voice: a Spanish script gets a Spanish voice, never an English one', () => {
  assert.deepEqual(pickVoice(undefined, '¿Sabías que la IA no es magia?', 'darwin'), { engine: 'kokoro', id: 'ef_dora' });
  assert.deepEqual(pickVoice(undefined, 'Treinta segundos es lo que ocupas para usar la IA', 'linux'), { engine: 'kokoro', id: 'ef_dora' });
  assert.deepEqual(pickVoice('say', 'Hola, esto es una prueba de voz'), { engine: 'say', id: 'Paulina' });
  assert.deepEqual(pickVoice('say', 'hello there, this is a test'), { engine: 'say', id: 'Samantha' });
  assert.equal(isSpanish('Make a launch video for the site'), false);
  assert.equal(isSpanish('你好'), false);
});

test('wordsOf flattens timed words across sentences, in order', () => {
  const sentences = splitSentences(SCRIPT).map((s, i) => ({ text: s, tokens: placeSentence(tokenize(s), [[i * 3, i * 3 + 2.5]]) }));
  const words = wordsOf(sentences);
  monotonic(words, 0, 11.5);
  assert.equal(words[0].word, 'huashu-motion');
});

test('applyVoice never adds a data-duration to a root that has none (length follows the timeline)', () => {
  const html = HTML.replace(' data-duration="8"', '');
  const a = applyVoice(html, { src: 'assets/voice.wav', duration: 9.27, sentences: SENTENCES, fit: true });
  assert.equal(a.rootDuration, null);
  assert.equal(a.newDuration, null);
  assert.match(a.html, /data-composition-id="film" data-width="1920" data-height="1080">/);
});

test('cueTerms ignores examples inside comments', () => {
  const html = `<!-- OM.cue('词') --><script>/* OM.cue('块') */ // OM.cue('行')\nconst u = "https://x"; tl.to(a, {}, cue('真的'))</script>`;
  assert.deepEqual(cueTerms(html).map((c) => c.term), ['真的']);
});

test('applyVoice ignores tags quoted inside HTML comments', () => {
  const html = HTML.replace('<body>', '<body>\n<!-- om voice writes <audio id="om-voice"> and <script id="om-cues"> here -->');
  const a = applyVoice(html, { src: 'assets/voice.wav', duration: 3, sentences: SENTENCES });
  assert.ok(a.html.includes('<!-- om voice writes <audio id="om-voice"> and <script id="om-cues"> here -->'));
  assert.equal(a.html.match(/<audio id="om-voice" src=/g).length, 1);
  assert.equal(applyVoice(a.html, { src: 'assets/voice.wav', duration: 3, sentences: SENTENCES }).html, a.html);
});

test('tokenize keeps accented words whole (Spanish, German), so a cue can anchor to them', () => {
  const words = (s) => tokenize(s).filter((t) => t.word).map((t) => t.text);
  assert.deepEqual(words('Sígueme para más trucos.'), ['Sígueme', 'para', 'más', 'trucos']);
  assert.deepEqual(words('El año pasado, über café'), ['El', 'año', 'pasado', 'über', 'café']);
  assert.deepEqual(words('GPT-4.1 cuesta 20% menos'), ['GPT-4.1', 'cuesta', '20%', 'menos']);
});

test('a recording is transcribed in its own language: never assumed Chinese or English for a Spanish voice', () => {
  assert.equal(recordingLang(null), 'auto', 'no script: whisper detects it');
  assert.equal(recordingLang('Hola, esta es mi opinión honesta sobre la inteligencia artificial.'), 'es');
  assert.equal(recordingLang('Hello, this is my honest opinion about it'), 'en');
  assert.equal(recordingLang('你好，这是我的看法'), 'zh');
  assert.equal(recordingLang('Olá, tudo bem', { lang: 'pt' }), 'pt', '--lang wins');
});

test('voice: anchors to a word said more than once that name no occurrence are found (they take the first)', () => {
  const words = [{ word: 'Chat', start: 0.4 }, { word: 'el', start: 0.9 }, { word: 'chat,', start: 1.1 }, { word: 'hola', start: 1.5 }];
  const terms = cueTerms("OM.cue('chat'); SRM.cue('chat', 2); OM.cue('hola'); OM.cue('chat', n); // OM.cue('el')");
  assert.deepEqual(terms.map((t) => [t.term, t.explicit]), [['chat', false], ['chat', true], ['hola', false], ['chat', true]]);
  assert.deepEqual(repeatedCues(words, terms), [{ term: 'chat', at: [0.4, 1.1] }]);
  assert.deepEqual(repeatedCues(words, cueTerms("OM.cue('chat', 1); OM.cue('hola')")), [], 'naming the first on purpose is not a finding');
});

// ---------- a voice engine's own times (ElevenLabs) ----------

// "Hola, mundo" as ElevenLabs times it: one start and end per character, the comma and the space included
const HOLA = [...'Hola, mundo'];
const at = (i) => +(i * 0.1).toFixed(2);

test('engineTimes reads what ElevenLabs returns: the REST alignment, the SDK camelCase, word lists, forced alignment', () => {
  const rest = engineTimes({ audio_base64: '', alignment: { characters: HOLA, character_start_times_seconds: HOLA.map((_, i) => at(i)), character_end_times_seconds: HOLA.map((_, i) => at(i + 1)) } });
  assert.equal(rest.text, 'Hola, mundo');
  assert.equal(rest.chars.map((c) => c.ch).join(''), 'Holamundo', 'speech characters only');
  assert.deepEqual([rest.chars[4].start, rest.chars[4].end], [0.6, 0.7], '"m" keeps its own time');
  assert.equal(rest.span, 1.1);
  const sdk = engineTimes({ audioBase64: '', alignment: { characters: HOLA, characterStartTimesSeconds: HOLA.map((_, i) => at(i)), characterEndTimesSeconds: HOLA.map((_, i) => at(i + 1)) } });
  assert.deepEqual(sdk.chars, rest.chars);
  // a pipeline's export (words split at spaces, punctuation attached) and its duration
  const words = engineTimes({ duration: 2, words: [{ word: 'Hola,', start: 0, end: 0.4 }, { word: 'mundo', start: 0.6, end: 1 }] });
  assert.equal(words.text, 'Hola, mundo');
  assert.equal(words.span, 1, 'the span ends with the last character, whatever the file says about its length');
  assert.deepEqual([words.chars[0].start, words.chars[3].end, words.chars[4].start, words.chars.at(-1).end], [0, 0.4, 0.6, 1]);
  // speech-to-text: spacing and audio events are not words
  const stt = engineTimes({ words: [{ text: 'Hola', start: 0, end: 0.4, type: 'word' }, { text: ' ', start: 0.4, end: 0.6, type: 'spacing' }, { text: '(risas)', start: 0.6, end: 0.9, type: 'audio_event' }, { text: 'mundo', start: 0.9, end: 1.3, type: 'word' }] });
  assert.equal(stt.text, 'Hola mundo');
  assert.equal(stt.chars.length, 9);
  const forced = engineTimes({ characters: [{ text: 'H', start: 0, end: 0.1 }, { text: 'i', start: 0.1, end: 0.2 }], words: [{ text: 'Hi', start: 0, end: 0.2 }] });
  assert.equal(forced.chars.map((c) => c.ch).join(''), 'Hi');
  assert.throws(() => engineTimes({}), /no times/);
  assert.throws(() => engineTimes({ alignment: { characters: ['a', 'b'], character_start_times_seconds: [0], character_end_times_seconds: [0.1, 0.2] } }), /alignment/);
  assert.throws(() => engineTimes({ words: [{ word: 'a', start: 'x', end: 1 }] }), /not a time/);
});

test('placeExact: each word from its first character to its last, so the silences between words stay', () => {
  const { chars } = engineTimes({ words: [{ word: 'Hola,', start: 0, end: 0.4 }, { word: 'mundo.', start: 0.62, end: 1 }] });
  const sentences = splitSentences('Hola, mundo.').map((s) => ({ text: s, tokens: tokenize(s) }));
  const script = sentences.flatMap((s) => s.tokens.filter((t) => t.word).flatMap((t) => [...t.text]));
  const words = wordsOf(placeExact(sentences, charTimes(script, chars).times));
  assert.deepEqual(words, [{ word: 'Hola', start: 0, end: 0.4 }, { word: 'mundo', start: 0.62, end: 1 }]);
});

test('levels: the narration loudness 30 times a second, 0 in silence, z on the loud syllables', () => {
  const rate = 12000, samples = new Float32Array(rate);
  for (let i = rate / 2; i < rate; i++) samples[i] = 0.5 * Math.sin((2 * Math.PI * 220 * i) / rate);
  const a = levels(samples, rate);
  assert.equal(a.length, 30);
  assert.equal(a.slice(0, 14), '0'.repeat(14));
  assert.ok([...a.slice(16)].every((c) => parseInt(c, 36) >= 33), a);
  assert.equal(levels(new Float32Array(rate), rate), '0'.repeat(30), 'a silent take is all closed');
});

const HAS_FF = spawnSync('ffmpeg', ['-version']).status === 0;

test('srm voice --words: a take with its ElevenLabs times — sped up here with --speed, or found already sped up', { skip: !HAS_FF && 'no ffmpeg' }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'srm-words-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html><html><head><meta charset="utf-8"></head><body><div data-composition-id="f" data-width="320" data-height="568" data-duration="3"></div></body></html>');
  // "Hola" 0–0.8 s, a pause, "mundo" 1.2–2.0 s, as ElevenLabs would time it at 1×
  const take = join(dir, 'take.wav'), fast = join(dir, 'take-1.2x.wav');
  assert.equal(spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=220:duration=2.4', '-af', "volume=0.4,volume=enable='between(t,0.8,1.2)+gte(t,2)':volume=0", '-ar', '48000', take]).status, 0);
  assert.equal(spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', take, '-af', 'atempo=1.2', fast]).status, 0);
  const chars = [...'Hola mundo'], starts = [0, 0.2, 0.4, 0.6, 0.8, 1.2, 1.36, 1.52, 1.68, 1.84], ends = [0.2, 0.4, 0.6, 0.8, 1.2, 1.36, 1.52, 1.68, 1.84, 2.0];
  writeFileSync(join(dir, 'times.json'), JSON.stringify({ alignment: { characters: chars, character_start_times_seconds: starts, character_end_times_seconds: ends } }));
  const cues = () => JSON.parse(/<script type="application\/json" id="om-cues">([\s\S]*?)<\/script>/.exec(readFileSync(join(dir, 'index.html'), 'utf8'))[1]);
  const close = (a, b) => assert.ok(Math.abs(a - b) < 0.02, `${a} ≈ ${b}`);

  // the 1× take, sped up by srm voice: the audio and every time 1/1.2 as long
  const out = await voice(openProject(dir), { audio: take, words: join(dir, 'times.json'), text: 'Hola, mundo.', speed: 1.2 });
  assert.match(out, /alignment/);
  let c = cues();
  assert.equal(c.precision, 'alignment');
  assert.match(c.source, /×1\.2/);
  close(c.duration, 2.0);
  assert.deepEqual(c.words.map((w) => w.word), ['Hola', 'mundo']);
  close(c.words[0].end, 0.667); close(c.words[1].start, 1.0); close(c.words[1].end, 1.667);
  // the loudness for the mouths: open on the words, closed in the pause between them
  assert.equal(c.env.fps, 30);
  assert.ok(Math.abs(c.env.a.length - 60) <= 1, String(c.env.a.length));
  assert.ok(parseInt(c.env.a[10], 36) > 30, 'inside "Hola"');
  assert.equal(c.env.a[25], '0', 'in the pause');

  // the take already sped up after it was timed: the times are scaled, the audio is not sped up again
  const again = await voice(openProject(dir), { audio: fast, words: join(dir, 'times.json'), speed: 1.2 });
  assert.match(again, /sped up ×1\.2 after it was timed/);
  c = cues();
  assert.doesNotMatch(c.source, /×/);
  close(c.duration, 2.0);
  close(c.words[1].start, 1.0);
});
