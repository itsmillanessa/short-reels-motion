// The language the CLI talks to the creator in — help, doctor, templates, kit: Spanish or English. SRM_LANG (or the
// studio's OM_LANG), then the creator's kit (srm kit set lang=es-MX), then the system's locale. The engine's own reports
// (check, qa, render, voice) stay in English: the agent reads them and tells the creator in their language.
import { readKit } from './kit.js';

const kitLang = () => { try { return readKit().lang; } catch { return null; } };
const systemLang = () => { try { return Intl.DateTimeFormat().resolvedOptions().locale; } catch { return null; } };

export function cliLang({ env = process.env, kit = kitLang, system = systemLang } = {}) {
  for (const l of [env.SRM_LANG, env.OM_LANG, kit(), system()]) {
    const base = String(l || '').toLowerCase().split(/[-_]/)[0];
    if (base === 'es' || base === 'en') return base;
    if (base) return 'en';   // a language the CLI does not speak (zh: the studio does): English
  }
  return 'en';
}

// tr({ es: '…', en: '…' }) in the CLI's language.
export const tr = (texts, lang = cliLang()) => texts[lang] ?? texts.en;
