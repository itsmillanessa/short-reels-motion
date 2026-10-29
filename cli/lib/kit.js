// The creator's kit: what every one of their shorts shares, said once and kept on this machine (kit.json in the
// Short Reels Motion home, SRM_KIT to move it). `srm new` applies it to the new project: the variables the template
// declares with these ids get the kit's values (the handle, the closing line, the colours, the narrator's look), the
// page gets the kit's language and platforms. `srm voice` takes the kit's voice and speed when no flag says otherwise.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homeDir } from './brand.js';
import { OmError, readVariables, setVariables } from './project.js';

export const kitFile = () => process.env.SRM_KIT || join(homeDir(), 'kit.json');

// key → type; every key but the last three is also a template variable id
export const KEYS = {
  handle: 'string', cta: 'string', ground: 'color', ink: 'color', accent: 'color', accentInk: 'color', cover: 'boolean',
  lang: 'string', platforms: 'string', voice: 'string', speed: 'number',
};
// the narrator's look (storytime's «Personaje» variables, TOON.person's character)
export const CHARACTER = ['skin', 'hair', 'hairColor', 'eyeColor', 'beard', 'beardColor', 'top', 'topColor', 'sleeves', 'tattoos', 'tattooColor',
  'bottomColor', 'shoes', 'footwear', 'accessory', 'accessoryColor', 'earring'];
const PAGE = new Set(['lang', 'platforms', 'voice', 'speed']);   // not variables: the page, or srm voice

export function readKit(file = kitFile()) {
  if (!existsSync(file)) return {};
  try { const k = JSON.parse(readFileSync(file, 'utf8')); return k && typeof k === 'object' ? k : {}; }
  catch (e) { throw new OmError(`${file} is not valid JSON: ${e.message}`); }
}

const parse = (key, type, raw) => {
  const v = String(raw).trim();
  if (type === 'number') { const n = Number(v); if (!Number.isFinite(n)) throw new OmError(`${key}: "${raw}" is not a number`); return n; }
  if (type === 'boolean') { if (!/^(true|false|1|0|sí|si|no)$/i.test(v)) throw new OmError(`${key}: "${raw}" is not true or false`); return /^(true|1|sí|si)$/i.test(v); }
  if (type === 'color' && !/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v)) throw new OmError(`${key}: "${raw}" is not a colour like #E4007C`);
  if (key === 'handle' && v && !v.startsWith('@')) return '@' + v;
  return v;
};

// pairs: { "handle": "@x", "accent": "#E4007C", "character.hair": "curly" }; an empty value removes the key
export function setKit(pairs, file = kitFile()) {
  const kit = readKit(file);
  for (const [k, raw] of Object.entries(pairs)) {
    const [head, sub] = k.split('.');
    if (head === 'character') {
      if (!CHARACTER.includes(sub)) throw new OmError(`unknown character field "${sub}" — known: ${CHARACTER.join(', ')}`);
      kit.character = kit.character || {};
      if (String(raw).trim() === '') delete kit.character[sub]; else kit.character[sub] = String(raw).trim();
      continue;
    }
    if (!KEYS[k]) throw new OmError(`unknown kit key "${k}" — known: ${Object.keys(KEYS).join(', ')}, character.<${CHARACTER.join('|')}>`);
    if (String(raw).trim() === '') delete kit[k]; else kit[k] = parse(k, KEYS[k], raw);
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(kit, null, 2) + '\n');
  return kit;
}

// a whole kit from a JSON file (a creator's kit.json kept with their channel); unknown keys are refused
export function importKit(from, file = kitFile()) {
  let src;
  try { src = JSON.parse(readFileSync(from, 'utf8')); } catch (e) { throw new OmError(`${from}: ${e.message}`); }
  const pairs = {};
  for (const [k, v] of Object.entries(src)) {
    if (k.startsWith('_')) continue;                                     // notes for people
    if (k === 'character' && v && typeof v === 'object') { for (const [c, cv] of Object.entries(v)) pairs['character.' + c] = cv; continue; }
    pairs[k] = v;
  }
  return setKit(pairs, file);
}

// The kit's values into a page: variables the template declares with the same ids, <html lang>, the root's data-platforms.
// Returns { html, applied: [names], skipped: [why] }.
export function applyKit(html, kit) {
  const declared = new Set(readVariables(html).map((v) => v.id));
  const values = {};
  for (const [k, v] of Object.entries(kit)) if (!PAGE.has(k) && k !== 'character' && declared.has(k)) values[k] = v;
  for (const [c, v] of Object.entries(kit.character || {})) if (declared.has(c)) values[c] = v;
  // one by one: a value this template does not accept (an option it does not offer) is skipped, never a failed project
  const applied = [], skipped = [];
  let out = html;
  for (const [k, v] of Object.entries(values)) { try { out = setVariables(out, { [k]: v }); applied.push(k); } catch (e) { skipped.push(`${k} (${e.message})`); } }
  if (kit.lang && /^[a-z]{2}(-[A-Za-z]{2})?$/.test(kit.lang)) { out = out.replace(/<html\b([^>]*?)\slang="[^"]*"/i, `<html$1 lang="${kit.lang}"`); applied.push('lang'); }
  if (kit.platforms && /data-platforms="[^"]*"/.test(out)) { out = out.replace(/data-platforms="[^"]*"/, `data-platforms="${String(kit.platforms).replace(/"/g, '')}"`); applied.push('platforms'); }
  return { html: out, applied, skipped };
}
