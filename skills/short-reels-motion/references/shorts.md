# Cómo se dirige un short

La guía práctica detrás de [SKILL.md](../SKILL.md). Sale de shorts reales producidos con esta herramienta (octubre de 2026):
lo que subió la calidad, lo que se rechazó al verlo y los defectos que solo aparecieron al revisar cuadro por cuadro.
Es el punto de partida; cuando el creador pide otra cosa, manda el creador (y se guarda con `srm learn add`).

## 1. Qué hace que un short funcione (en orden de impacto)

1. **El gancho está en el cuadro 0.** La promesa (un número, un problema, un "deja de hacer X") se ve grande desde el primer
   cuadro: es la portada que muestran los feeds antes de reproducir. Nunca un cuadro vacío que "se va armando".
   Fórmulas que funcionan: «30 segundos es lo único que ocupas para…», «Esto te ahorra 20 minutos», «Deja de hacer X»,
   «El error que comete todo mundo con X», «Haz esto antes de X». La palabra clave entra justo cuando la voz la dice.
2. **Una animación por frase.** Lo que la voz dice se ve, literal: si dice «exprime la suscripción», una tarjeta se exprime
   en un vaso; si dice «inventa datos con mucha seguridad», un medidor sube a 99 % y cae un sello de FALSO. Algo nuevo
   cada 2–3 s; nunca más de 1 s quieto salvo el remate o el cierre. Esto es lo que separa «se ve hecho por IA» de «me encantó».
3. **Material real antes que dibujos.** Grabación real de la pantalla > captura real > reconstrucción trazada sobre la app
   real (sus textos, colores y nombres de botones) > nunca un diagrama con iconos genéricos. Los gráficos del video son la
   capa encima del contenido, no el contenido.
4. **Una idea por video, 30–45 s.** El número del gancho puede decir «30 segundos» aunque dure 40.
5. **Voz más rápida que una plática:** 1.15–1.25× para voz generada o una grabación pausada.
6. **Cierre corto y fijo:** el @usuario del creador y una sola llamada (sígueme, guárdalo, compártelo). Sin «eso es todo».
7. **Sobriedad visual:** 2 o 3 colores y una tipografía fuerte (pesos 800–900, interletrado cerrado). La energía la ponen
   el ritmo y el movimiento, no los colores.

## 2. El guion se aprueba antes de producir

Cambiar el guion después de producir obliga a rehacer la voz y a reanclar todo. Un guion aprobado con el material ya
grabado sale en una sesión y 3–4 renders; uno que cambia a media producción tomó 21.

Estructura de 30–45 s:

| Tramo | Tiempo | Qué pasa |
|---|---|---|
| Gancho | 0–3 s | La promesa, grande, en el cuadro 0 |
| Problema o contexto | 3–8 s | Por qué importa, en una frase |
| Pasos o puntos | 8–35 s | 2 a 4 golpes, cada uno con su animación o su pedazo de grabación |
| Remate | 35–40 s | El resultado, el número, el «y listo» |
| Cierre | últimos 2–3 s | @usuario + una llamada |

Palabras: unas 2.5–3 por segundo a velocidad normal, 3–3.5 a 1.2× (35 s ≈ 90–110 palabras).

Preséntalo como tabla: **tiempo · voz · en pantalla** (la animación literal de cada frase) + **qué grabar** (cara 5 s;
pantalla 15–25 s por función). Usa los nombres reales de la app: lee la app o su sitio antes de escribir («Complementos»,
no «Conectores», si así le dice la app en español). El público no ve números de episodio: ni «Día 3» en pantalla ni en voz.

## 3. El material del creador

Pide las grabaciones **antes** de construir. Lo que llega del teléfono necesita limpieza:

- **Convertir** (HEVC, 60–120 fps, resolución enorme → H.264 30 fps al ancho que usa la plantilla):
  ```sh
  ffmpeg -i grabacion.MOV -an -vf "scale=920:-2,fps=30" -c:v libx264 -crf 20 -pix_fmt yuv420p tmp.mp4
  ```
- **Quitar la barra de estado** (hora, batería): recorta arriba después de escalar, p. ej. `crop=920:1440:0:150`.
- **Cortar exacto con ffmpeg** (`-ss 3.2 -to 9.8`) y dejar `data-media-start` en 0: el recorte fino en el archivo es más
  confiable que en la composición.
- **Tiempo muerto fuera:** cargas, esqueletos, «pensando…». Córtalo o acelera ese tramo en el archivo (`setpts=0.5*PTS`).
  El tiempo muerto del teléfono también es tiempo muerto en el video.
- **Privacidad:** antes de usar una grabación, haz su hoja de contacto
  (`ffmpeg -i tmp.mp4 -vf "fps=1,scale=240:-1,tile=6x4" hoja.png`) y búscale correos, nombres, notificaciones, cuentas,
  prompts de trabajo. Tápalo (`drawbox=x=…:y=…:w=…:h=…:color=black@1:t=fill`), recórtalo o pregunta.
- **HDR:** `srm check` marca `hdr-video`. Pide grabar sin HDR o convierte a SDR (bt709) antes de usarla.
- Guarda los originales fuera del proyecto o en una carpeta ignorada; al proyecto solo va lo que usa el video.

## 4. La voz

| Opción | Cómo |
|---|---|
| Grabación del creador | `srm voice <dir> --audio voz.m4a --text guion.txt` (whisper alinea palabra por palabra; necesita `whisper-cli`) |
| Voz generada gratis | `srm voice <dir> --text guion.txt` (un guion en español usa una voz en español: Kokoro `ef_dora`, o `say:Paulina` en Mac) |
| ElevenLabs u otra voz clonada | El creador genera el audio (o tú con su API, con la key en una variable de entorno, nunca impresa) y entra con `--audio` |

- Velocidad: `ffmpeg -i voz.mp3 -filter:a atempo=1.2 voz-1.2x.mp3` **antes** de `srm voice --audio`; la alineación sale
  ya con los tiempos rápidos.
- Ancla el movimiento a palabras: `OM.cue('receta')`, `OM.cue('paso', 2)` (la segunda vez), `OM.cue('listo', 1, 'end')`.
  La coincidencia es de palabra completa (con acentos); si una palabra se repite, usa `nth` o una palabra única de la frase.
  En las plantillas, los pasos aceptan `{ "word": "receta" }` en lugar de `{ "at": 5.0 }`.
- Con narración el volumen final queda en −14 LUFS solo (donde normalizan las apps). La música baja bajo la voz sola.
- Subtítulos: `srm voice` deja un `.srt` en `out/`. En videos de tipografía no hacen falta (las palabras grandes ya son
  el texto); en cara a cámara ayudan (mucha gente ve sin sonido).

## 5. Formato → plantilla

| Formato | Plantilla | Notas |
|---|---|---|
| Tip o tutorial de una app | `short-pantalla` | Vertical nativa. Grabación arriba, textos clave en la banda segura, toques y zoom en coordenadas 0–1 de la pantalla |
| Cara a cámara | `short-cara` | Vertical nativa. Tu video a pantalla completa, gancho en recuadro arriba, rótulo con tu nombre, palabras clave y subtítulos de tu voz. La voz sale del video: `srm voice <dir> --audio assets/<video>.mp4`. Para capas transparentes sobre tu edición: `talking-head` ([talking-head.md](talking-head.md)) |
| Historia o chiste con personaje | `storytime` → fork a 1080×1920 | El personaje se configura en el grupo «Personaje» (piel, pelo, ropa, accesorio, barba, tatuajes…) |
| Frases con tipografía, sin material | `short-tipografia` | Vertical nativa. Cada frase es un golpe (`fx`: slam, rise, count, strike); `*acento*`, `~tachado~`; el tamaño se ajusta solo |
| Datos y cifras | `finance-chart` → fork | Una sola anotación por gráfica |
| Lista / top 3, antes y después | `blank` → fork y escribirlo con `vendor/srm.js` | `SRM.slam`, `SRM.between`, `SRM.counter` |

`srm fork` deja un comentario de re-maquetación en la bandeja: `srm inbox <dir>-9x16 --wait` y acomoda para vertical.
Una plantilla que no trae `vendor/srm.js` lo puede usar copiando `runtime/srm-motion.js` del paquete a `vendor/srm.js`.

## 6. Zonas seguras (1080×1920)

TikTok, Reels y Shorts dibujan su interfaz encima del video: pestañas arriba, botones a la derecha, @usuario, texto y
canción abajo. **El texto que se tiene que leer** va entre y = 230 e y = 1480, y debajo de y = 760 a la izquierda de
x = 920. Imágenes, grabaciones y fondos pueden ir donde sea. `srm check` avisa `unsafe-zone` con el texto y la app que lo
tapa; `data-platforms="tiktok,reels"` en la raíz elige las apps. No dibujes guías encima del video: la herramienta lo
asume por dentro.

## 7. Movimiento (`vendor/srm.js`)

Cada función recibe el timeline y un tiempo, y devuelve el tiempo:

| Función | Qué hace |
|---|---|
| `SRM.slam(tl, el, at)` | Entra grande y se asienta (gancho, palabra clave), con golpe de sonido |
| `SRM.rise(tl, el, at)` | Sube desde una máscara (`.mask > span`) |
| `SRM.kickIn(tl, el, at)` · `SRM.pill(tl, el, at)` | Etiqueta que entra de lado · fondo de color que crece detrás de una palabra |
| `SRM.whipOut(tl, el, at)` · `SRM.squash(tl, el, at)` | Salidas que **terminan** en `at` y dejan el elemento apagado |
| `SRM.between(tl, el, at, until)` | Visible de `at` a `until`, con salida limpia |
| `SRM.typeOn(tl, el, texto, desde, hasta)` | Texto que se escribe letra por letra (un prompt) |
| `SRM.counter(tl, el, desde, hasta, n)` | Número que cuenta (enteros) |
| `SRM.tap(tl, at, x, y)` | Un dedo que toca: punto, onda y clic (necesita `#tapdot` y `#ripple`) |
| `SRM.zoom(tl, el, at, { fx, fy, scale, hold })` | Acercamiento a una parte de la pantalla y regreso |
| `SRM.flash(tl, at)` | Destello del acento, alineado a cuadros y sostenido 2 cuadros |
| `SRM.when({ word, at })` | El tiempo de un paso: la palabra si hay narración, si no los segundos |

Detalles que ya costaron rondas:

- Toda salida deja `autoAlpha: 0` en su final; si el ancla falla, una escena que no se apaga queda debajo de todo lo demás.
- Deja ≥ 0.5 s entre el último elemento que entra y la salida de la escena (si no, parpadeo de un cuadro).
- Un destello ≤ .22 de opacidad, sostenido 2 cuadros (`SRM.flash`); más corto se ve como falla.
- Los números con decimales se escriben en el HTML y se revelan; pasarlos por `textContent` en un tween convierte «38.00» en 38.
- `h1`/`p` con `margin: 0`: el margen del navegador baja el texto y choca con la línea siguiente.
- Lo que se ve en el cuadro 0 se pinta en el CSS, no con un `tl.set` en el tiempo 0 (al buscar el cuadro 0 no se aplica).
- Texto grande encima de una grabación real: encoge la grabación hacia arriba y usa la banda libre, no pises su texto.

## 8. Revisión antes de entregar (no es opcional)

1. `srm check <dir>`: 0 errores y 0 `unsafe-zone`.
2. `srm render <dir>` y `srm qa <dir>`: sin parpadeos de un cuadro, cuadro 0 lleno, nada quieto ≥ 1 s salvo el cierre.
3. **Hoja de contacto, un cuadro por segundo**, y mírala completa:
   ```sh
   ffmpeg -i out/<nombre>-vN.mp4 -vf "fps=1,scale=216:-1,tile=10x5" out/hoja.png
   ```
   Busca: texto cortado o fuera del cuadro, texto encima del texto de la grabación, escenas que no se apagan, huecos sin
   nada nuevo, cifras truncadas, la grabación en un momento de carga. En shorts reales esta revisión encontró 7 defectos
   que `check` no vio.
4. Escribe las tres notas que daría un creador exigente (aburrido en medio, gancho flojo, texto sobre la interfaz,
   algo que no se lee en un teléfono) y corrígelas antes de enseñarlo.
5. El volumen no se toca: con narración sale en −14 LUFS.

## 9. Portada y entrega

- **Portada:** el cuadro 0 es la portada. Para Instagram, que acepta imagen aparte:
  `srm still <dir> --at 0 --out out/portada.png`. Para TikTok, que solo deja elegir un cuadro, pon la portada en los
  2 primeros cuadros (`short-pantalla` la trae activada: variable `cover`, grupo «Portada»).
- **Video:** `srm render <dir>` → MP4 1080×1920, 30 fps, H.264, −14 LUFS. El mismo archivo sirve para TikTok, Reels y Shorts.
- **Texto de la publicación:** escribe `out/publicacion.md` en el idioma del creador: 3 opciones de descripción
  (≤ 150 caracteres), 3–5 hashtags y un título para Shorts.
- **Nunca publiques ni subas nada:** eso lo hace el creador.

## 10. Lo que se rechazó al verlo

Pedido y luego quitado en producción real (un creador, 2026-10). Úsalo como advertencia, no como ley:

- Fondos con manchas de color y brillos morados «de IA»; degradados arcoíris o magenta-azul.
- Iconos genéricos (bombillas, cohetes, chispas, cerebros, varitas): ilustra con el objeto real o con tipografía.
- Logotipos de marcas de terceros: nombra la categoría en texto, salvo que el creador entregue los archivos y lo pida.
- Subtítulos karaoke palabra por palabra en videos de tipografía.
- Pastillas o textos inclinados sin razón; insignias de «Día N».
- Guías o marcas dibujadas encima del video en el studio.
