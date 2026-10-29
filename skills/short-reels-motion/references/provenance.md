# Fuentes y solidez de la evidencia

Destilado el 2026-10-09. Los resultados históricos de aquí vienen todos de los registros de proyecto de los skills de origen; en esta ronda no se volvieron a ver todos sus videos terminados ni se recalcularon por separado las métricas de los registros viejos. Por eso se toman solo como puntos de partida del método, con su fuente, y no como garantía general de resultados.

- huashu-art-motion, `references/07-正面经验.md` (experiencia positiva): los objetos usan el tiempo del video completo, transiciones que salen del material, azar determinista, caché de lo estático, cues por palabra, interpretar la quietud según la gramática. `06-口播驱动的艺术短片.md` (cortos artísticos guiados por la narración): primero el audio y luego la imagen, el lienzo como mundo, encuadrar según el contenido, el silencio tiene que existir en la narración. `11-进化协议.md` (protocolo de evolución): los problemas antes que la calificación, la experiencia baja de los textos a las herramientas.
- huashu-video-pipeline, `references/21-动画段.md` (tramos de animación) y `scripts/anim_clip.py`: elegir la animación según lo que hay que explicar, el tiempo del video terminado como única interfaz, anclas por palabra, verificar la sincronía después de cada cambio. Las reglas de correcciones de su SKILL.md: heredar los parches de la versión anterior y verificar según el alcance del cambio.
- huashu-design, `references/storyboard-basics.md`: primero los cuadros clave y después la coreografía; composición y estilo por separado. `camera-language.md`: cámara y objetos en capas separadas, encuadres con un objetivo. `animation-best-practices.md`: jerarquía del movimiento y contraste de ritmo; los easings y las proporciones de ritmo concretas se quedan como recetas para ciertos casos, no se vuelven axiomas.

Proyectos públicos: [art-motion](https://github.com/alchaincyf/huashu-art-motion), [design](https://github.com/alchaincyf/huashu-design). Las rutas exactas de los archivos fuente de esta ronda, sus SHA y los registros privados de conflictos se guardan aparte en los materiales de mantenimiento del proyecto; no se distribuyen con el skill.

## Conclusiones de esta ronda

Son juicios de integración que todavía falta validar con otros temas: tomar «intención de explicar → cuadros clave → cambio de los objetos → tomas → anclas de tiempo → verificación» como núcleo pequeño; separar las gramáticas de animación de los materiales; dejar que la línea de producción anterior se siga encargando del procesamiento de grabaciones que ya tenía y de la edición compleja.

No se heredan como reglas generales: que cada cuadro tenga que moverse, cortes cada cierto número fijo de segundos, un easing fijo, efectos de sonido sin condiciones, una firma o marca de agua uniforme, que toda figura humana tenga que ser una imagen generada, la velocidad del habla o los colores que solo le quedan a un autor. Las tres direcciones son hoy la forma de colaborar por defecto y el creador puede cambiarla de forma explícita; no son una ley física de la buena animación.

La generalización histórica del proyecto original de que «siempre lento es mejor» ya la refutaron comentarios posteriores que pedían movimientos de cámara rápidos, así que este proyecto solo conserva los principios de motivación y legibilidad. Las preferencias personales y los permisos de una sola vez no pasan al skill público.
