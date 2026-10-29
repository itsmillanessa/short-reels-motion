# Licencias de fuentes · Font licenses

Las fuentes de este directorio NO están cubiertas por la licencia MIT del repositorio. Cada una conserva su licencia original; todas son SIL Open Font License 1.1 (texto completo en `OFL.txt` en este mismo directorio): se pueden redistribuir con el software y usar comercialmente, pero no vender los archivos de fuente por separado. Algunos archivos son subconjuntos (por GB2312 o por los caracteres usados, `scripts/font_subset.py`) convertidos a WOFF.

The fonts in this directory are NOT covered by the repository's MIT license. Each keeps its own license; all of them are SIL Open Font License 1.1 (full text in `OFL.txt`). Some files are subsets converted to WOFF.

| Archivo | Fuente | Copyright | Origen |
|---|---|---|---|
| `AlfaSlabOne-400.woff` | Alfa Slab One | © 2016 The Alfa Slab One Project Authors, Reserved Font Name "Alfa Slab" | Google Fonts |
| `Anton-400.woff` | Anton | © 2020 The Anton Project Authors | Google Fonts |
| `ArchivoBlack-400.woff` | Archivo Black | © 2017 The Archivo Black Project Authors | Google Fonts |
| `Bangers-400.woff` | Bangers | © 2010 The Bangers Project Authors | Google Fonts |
| `Caveat-600.woff` | Caveat | © 2014 The Caveat Project Authors | Google Fonts |
| `Cinzel-400.woff` `Cinzel-700.woff` | Cinzel | © 2020 The Cinzel Project Authors | Google Fonts |
| `CormorantGaramond-500.woff` `-500i` `-700` | Cormorant Garamond | © 2015 The Cormorant Project Authors | Google Fonts |
| `EBGaramond-400.woff` `-400i` `-600` | EB Garamond | © 2017 The EB Garamond Project Authors | Google Fonts |
| `Exo2-800i.woff` | Exo 2 | © 2013 The Exo 2 Project Authors | Google Fonts |
| `GochiHand-400.woff` | Gochi Hand | © 2011 Huerta Tipográfica, Reserved Font Names "Gochi" and "Gochi Hand" | Google Fonts |
| `IMFellEnglish-400.woff` `-400i` | IM FELL English | © 2007 Igino Marini, Reserved Font Names "IM FELL English Roman/Italic" | Google Fonts |
| `Inter-var.woff` | Inter | © 2016 The Inter Project Authors | github.com/rsms/inter |
| `JosefinSans-700.woff` | Josefin Sans | © 2010 The Josefin Sans Project Authors, Reserved Font Name "Josefin Sans" | Google Fonts |
| `Kalam-700.woff` | Kalam | © 2014 Indian Type Foundry | Google Fonts |
| `LibreBaskerville-400.woff` `-700` | Libre Baskerville | © 2012 The Libre Baskerville Project Authors | Google Fonts |
| `LilitaOne-400.woff` | Lilita One | © 2011 Juan Montoreano, Reserved Font Name "Lilita One" | Google Fonts |
| `Marcellus-400.woff` | Marcellus | © 2012 Brian J. Bonislawsky (Astigmatic), Reserved Font Name "Marcellus" | Google Fonts |
| `PlayfairDisplay-400i.woff` `-700` `-700i` | Playfair Display | © 2017 The Playfair Display Project Authors, Reserved Font Name "Playfair Display" | Google Fonts |
| `Poppins-600.woff` `-700` `-800` | Poppins | © 2020 The Poppins Project Authors | Google Fonts |
| `PressStart2P-400.woff` | Press Start 2P | © 2012 The Press Start 2P Project Authors, Reserved Font Name "Press Start 2P" | Google Fonts |
| `Righteous-400.woff` | Righteous | © 2011 Brian J. Bonislawsky (Astigmatic), Reserved Font Name "Righteous" | Google Fonts |
| `RobotoCondensed-var.woff` | Roboto Condensed | © 2011 The Roboto Project Authors | Google Fonts |
| `Rye-400.woff` | Rye | © 2010 Sorkin Type Co, Reserved Font Name "Rye" | Google Fonts |
| `UnifrakturMaguntia-400.woff` | UnifrakturMaguntia | © 2010 j. 'mach' wust, © 2009 Peter Wiegel, Reserved Font Name "UnifrakturMaguntia" | Google Fonts |
| `cmunrm.woff` `cmunti.woff` | CMU Serif (Computer Modern Unicode) | Andrey V. Panov; algunos glifos provienen de AMS Blue Sky fonts | CTAN cm-unicode |
| `LXGWWenKai-500.woff` | LXGW WenKai (subconjunto) | © 2021-2025 LXGW; © 2020 The Klee Project Authors | github.com/lxgw/LxgwWenKai |
| `NotoSansSC-500/700/800/900.woff` | Noto Sans SC (subconjunto GB2312 instanciado por peso; en el código la familia se llama `PuHui-*`) | © 2014-2021 Adobe, Reserved Font Name "Source" | Google Fonts |
| `NotoSansSC-sub.woff` | Noto Sans SC (subconjunto por caracteres usados) | © 2014-2021 Adobe, Reserved Font Name "Source" | Google Fonts |
| `NotoSerifSC-sub.woff` | Noto Serif SC (subconjunto por caracteres usados) | © 2017-2024 Adobe | Google Fonts |
| `NotoSerifJP-600.woff` | Noto Serif JP | © 2017-2024 Adobe | Google Fonts |

Las fuentes con Reserved Font Name no pueden conservar ese nombre si se modifican. Las de este directorio que lo tienen (las latinas) mantienen su nombre interno original (se usan tal como las distribuye Google Fonts en WOFF); si vas a extraer subconjuntos o cambiar glifos, cambia también el nombre de familia.

## Nota de rewind-motion

`NotoSansSC-500/700/800/900.woff` y `LXGWWenKai-500.woff` de este directorio son subconjuntos reconstruidos para esta distribución: conservan todos los caracteres de los archivos originales de huashu-motion y agregan Latin-1 Supplement, Latin Extended-A y puntuación general (á é í ó ú ü ñ ¿ ¡ « » …), que los originales no traían. Se generaron con `scripts/build_fonts.py` a partir de `NotoSansSC[wght].ttf` (Google Fonts, OFL 1.1) y `LXGWWenKai-Medium.ttf` (github.com/lxgw/LxgwWenKai, OFL 1.1). Misma licencia, mismos nombres de familia (`PuHui-*`, `LXGWWenKai-500`) para que el motor los cargue sin cambios.
