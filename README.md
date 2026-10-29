<div align="center">

# Short Reels Motion

**Tu agente hace el short; tú señalas el cuadro para cambiarlo.**

Shorts, Reels y TikToks como código: video vertical, narración sincronizada palabra por palabra,
las zonas seguras de cada app y un editor en el navegador donde comentas sobre el cuadro.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Agent Skills](https://img.shields.io/badge/Agent%20Skills-Standard-green)](https://agentskills.io)

[Qué es](#qué-es) · [Instalar](#instalar) · [Cómo se usa](#cómo-se-usa) · [Voz](#voz) · [Zonas seguras](#zonas-seguras) · [Créditos](#créditos-y-licencia)

</div>

> **Estado:** en desarrollo, todavía privado. Faltan las plantillas verticales, la ingesta de grabaciones del celular, la
> exportación por plataforma y los videos demo propios. Ver [Hoja de ruta](#hoja-de-ruta).

---

## Qué es

Le dices a tu agente de código (Claude Code, Codex o cualquiera con skills) «hazme un reel de 35 segundos sobre cómo
usar la IA para resumir correos». Escribe el video como una página (HTML + GSAP), le pone tu voz o una voz generada,
lo sincroniza palabra por palabra y abre un editor en tu navegador. Haces clic donde algo no te gusta, escribes qué
quieres y el agente cambia exactamente eso. Al final exporta un MP4 listo para subir.

Lo que lo hace distinto para videos cortos:

| | |
|---|---|
| **Vertical primero** | Cuadros de 1080×1920, con las zonas donde TikTok, Reels y Shorts dibujan sus botones |
| **Voz en español** | Tu grabación, una voz local gratis o ElevenLabs; los movimientos caen en la palabra exacta |
| **Volumen de feed** | La mezcla de voz y música sale a −14 LUFS, donde normalizan las apps |
| **Editor en tu idioma** | El studio, las plantillas y los mensajes del motor en español (también inglés y chino) |
| **Tu marca, no la nuestra** | Sin marca de agua: el video termina con tu @usuario |

## Instalar

Requisitos: Node 22 o superior, Google Chrome (o Chromium / Edge) y FFmpeg.

```sh
git clone https://github.com/itsmillanessa/short-reels-motion.git
cd short-reels-motion && npm install && npm install -g .
srm doctor
```

Para que tu agente lo use, enlaza el skill:

```sh
ln -sfn "$PWD/skills/short-reels-motion" ~/.claude/skills/short-reels-motion
```

`srm` y `om` son el mismo comando.

## Cómo se usa

```sh
srm new mi-reel --template kinetic-type     # arranca un proyecto (srm templates lista las 12)
srm fork mi-reel mi-reel-9x16 --size 1080x1920
srm voice mi-reel-9x16 --audio voz.m4a      # tu grabación, alineada palabra por palabra
srm sound mi-reel-9x16                      # música y efectos, bajo la voz
srm studio mi-reel-9x16                     # editor en el navegador: C para comentar, S para zonas seguras
srm check mi-reel-9x16                      # texto cortado, tapado o bajo los botones de las apps
srm render mi-reel-9x16                     # MP4 listo para subir
```

Lo normal es no escribir estos comandos: se los pides a tu agente y él los corre.

## Voz

| Opción | Cómo | Costo |
|---|---|---|
| Tu propia grabación | `srm voice <dir> --audio voz.m4a` (whisper saca los tiempos de cada palabra: `brew install whisper-cpp`) | Gratis |
| Voz local Kokoro | `srm voice <dir> --text guion.txt` (voz `ef_dora` para guiones en español; se instala una vez, ~325 MB) | Gratis |
| Voz del sistema (Mac) | `--voice say:Paulina` | Gratis |
| ElevenLabs | en camino: voz clonada con tiempos exactos por palabra, con tu propia key | De pago |

## Zonas seguras

En un video vertical, `srm check` avisa cuando un texto queda debajo de la interfaz de la app (arriba: pestañas;
abajo: texto del post y sonido; derecha: like, comentar, compartir). En el studio, la tecla **S** las dibuja encima
del cuadro. `data-platforms="tiktok,reels"` en la raíz del video elige las apps; `data-layout-allow-safe-zone` exime
un elemento. Las medidas están en `cli/lib/safezones.js`; las apps las mueven de vez en cuando.

## Hoja de ruta

- [x] Cue por palabra exacta, mezcla a −14 LUFS, voz en español por defecto
- [x] Zonas seguras en `check` y en el studio
- [x] Studio que se recupera solo al reiniciarse; textos del motor en español
- [x] Plantillas y fuentes en español; firma apagada por defecto
- [x] Personaje propio y configurable (piel, pelo, ropa, accesorio) en la plantilla `storytime`
- [ ] Videos demo propios (`srm demo` todavía abre los del motor original)
- [ ] 5 plantillas verticales: tipografía, pantalla del celular, cara a cámara, lista, antes/después
- [ ] Librería de movimientos para shorts y kit de marca (`kit.json`)
- [ ] Ingesta de grabaciones del celular; portada y exportación por plataforma
- [ ] ElevenLabs como opción de voz; Kokoro en un paso
- [ ] Skill «director de shorts»; instalador para Mac y Windows

## Créditos y licencia

**Short Reels Motion** © 2026 [Alexis Millán](https://github.com/itsmillanessa), MIT.

Está construido sobre el motor de [**huashu-motion**](https://github.com/alchaincyf/huashu-motion) de
[Huashu (花叔)](https://github.com/alchaincyf), MIT. Su aviso de copyright se conserva en [`LICENSE`](LICENSE) y
[`NOTICE.md`](NOTICE.md) dice qué viene de ahí y qué cambia aquí. Las piezas de terceros conservan sus licencias
([`THIRD_PARTY.md`](THIRD_PARTY.md)): GSAP, Three.js y las fuentes (SIL OFL 1.1). Los README originales están en
[`docs/upstream/`](docs/upstream/).
