# Scripts de mantenimiento

Sirven para volver a generar esta distribución cuando huashu-motion publique plantillas o fuentes nuevas.

## translate_templates.py

```sh
python3 scripts/translate_templates.py ~/huashu-motion/templates /tmp/templates-es
```

Copia las plantillas y aplica el diccionario chino → español que vive dentro del script (unas 400 frases). Imprime `REVISAR` por cada archivo donde quede algún carácter chino: son frases nuevas del upstream; se agregan al diccionario `D` y se vuelve a correr. Después:

1. Traducir a mano `template.json` (`title`, `summary`, `best_for`) de cada plantilla nueva.
2. Revisar los `materials.md`.
3. Generar un proyecto por plantilla (`om new x --template …`), correr `om check` y mirar stills: el español es más largo que el chino y a veces hay que acortar un texto de ejemplo.

## build_fonts.py

```sh
python3 scripts/build_fonts.py NotoSansSC-var.ttf fonts/ ~/huashu-motion/fonts
```

Las fuentes CJK que trae huashu-motion (`NotoSansSC-500/700/800/900.woff`, subconjuntos GB2312, y `LXGWWenKai-500.woff`) **no incluyen á é í ó ú ü ñ ¿ ¡ « »**: en las plantillas de lienzo esas letras caían a una fuente del sistema. Este script reconstruye los cuatro pesos de Noto Sans SC a partir de la variable de Google Fonts (`ofl/notosanssc/NotoSansSC[wght].ttf`) con el mismo conjunto de caracteres del original más Latin-1, Latin Extended-A y puntuación general. Para LXGW WenKai se hace lo mismo con `LXGWWenKai-Medium.ttf` de github.com/lxgw/LxgwWenKai (ver el bloque al final del script). Requiere `fonttools` (`pip install fonttools`).
