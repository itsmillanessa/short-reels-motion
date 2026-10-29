import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// clip.js in a bare context: only the language table is exercised, the rest is never called
const clip = (lang) => {
  const window = {};
  vm.runInNewContext(readFileSync(new URL('../runtime/clip/clip.js', import.meta.url), 'utf8'), { window, document: { documentElement: { lang } }, console });
  return window.CLIP;
};

test('clip runtime: region names, drawn notes and problems follow <html lang>', () => {
  const es = clip('es-MX'), en = clip('en'), zh = clip('zh-CN'), none = clip('');
  assert.equal(es.tr('标题'), 'Título');
  assert.equal(es.tr('第 3 根柱 · FY2023'), 'Barra 3 · FY2023');
  assert.equal(es.tr('第 2 张卡（截图）'), 'Tarjeta 2 (captura)');
  assert.equal(es.tr('纵轴未从 0 开始'), 'el eje vertical no empieza en 0');
  assert.equal(es.tr('cue「hola」不在配音里，beat 用自带的 at=1.5s'), 'la palabra «hola» no está en la narración; beat usa su propio at=1.5s');
  assert.equal(en.tr('第 1 页主词'), 'Main word, page 1');
  assert.equal(zh.tr('标题'), '标题', 'Chinese films keep the original');
  assert.equal(none.lang, 'es', 'no lang: Spanish');
  assert.equal(es.tr('Ya en español'), 'Ya en español');
  assert.equal(es.tr('未知的句子'), '未知的句子', 'an unknown string passes through');
});
