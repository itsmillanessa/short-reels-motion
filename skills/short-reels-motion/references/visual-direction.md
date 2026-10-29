# Oficio visual y dirección de cámara

Léelo al hacer una animación nueva, cuando el creador pida más acabado o cuando digan que el video terminado se ve tosco o aburrido. Aquí se guía el criterio creativo: que el proyecto corra, que pase la comparación entre cuadros o que haya mucho material no certifica que se vea bien. Si un prototipo sirve para validar la técnica, márcalo como prototipo; no lo subas solo por eso a ejemplo creativo.

## Primero, decide qué vale la pena ver

Traduce el objetivo de explicación del brief en evidencia visible. Escribe el protagonista, el cambio, un detalle que valga la pena ver de cerca y lo que el espectador entiende al final. Por ejemplo, «a la estación le faltan bicis» tiene el flujo de toda la ciudad y también el anclaje vacío cuando se va la última bici; el número que llega a cero y el hueco en el espacio real se tienen que probar uno al otro.

Si hay referencias, mira las imágenes y el movimiento reales, no solo nombres de estilos: anota cuadros representativos, cuánto de la pantalla ocupa el sujeto, materiales, luz y sombra, cómo empieza y termina cada toma, los cambios de velocidad visibles, las pausas para leer la imagen y cómo se empalma una toma con la siguiente. Separa lo que observas de lo que supones. Un modelo que entiende video puede sumar el significado, pero no reemplaza revisar los cuadros originales; el empaque de un video promocional no prueba lo que el producto puede hacer.

Para demos de producto y flujos de interfaz entre dispositivos, lee cuando haga falta [la buena práctica del encuadre continuo](product-demo-continuity.md): los códigos de tiempo de la referencia de ChatGPT, la zona de lectura principal y la secundaria, reencuadres cortos con lectura estable, la capa de interfaz separada de la capa de encuadre, y la revisión tramo por tramo. Si adoptas su recorrido visual, vuelve a fijar las duraciones según la cantidad de información de tu video.

Sigue la dirección ya aprobada. Si no hay dirección, sigue el proceso para elegirla de SKILL.md. No le regreses la decisión creativa al creador con el pretexto de que «todavía no se especificaron todos los parámetros».

## Que la imagen aguante el acercamiento de la cámara

Deduce el nivel de detalle a partir del plano real y reparte el trabajo según lo que de verdad se va a ver:

- En plano general, primero la silueta, las capas de profundidad, los grupos de luz y sombra y el punto focal. Una ciudad necesita escala de manzanas, una orilla de río o una avenida principal, edificios altos y bajos, zonas densas y abiertas; no la misma caja repetida parejo por todas partes.
- En plano medio, agrega la estructura que explica el entorno: base, vanos de ventanas y aleros de los edificios; calles y banquetas; los apoyos de un puente; cómo se relaciona la estación con la calle. Los elementos repetidos van en familias con lógica y con variantes; no llenes todo de detalles al azar.
- En primer plano, los materiales y la construcción tienen que cumplir. Una bici necesita marco, llantas, manubrio y asiento que se reconozcan; el anclaje necesita estructura y sombra de contacto. Si cambia el tema, revisa la estructura, los bordes y los puntos de contacto de ese objeto; no copies la lista de la ciudad.

Revisa que la silueta geométrica, los brillos en los bordes, las diferencias de rugosidad, la translucidez o los reflejos, las sombras de contacto y la luz principal y de relleno describan entre todos el mismo material. Una corrección de color bonita no salva un grosor de hoja de papel, objetos que flotan en lugar de apoyarse ni una estructura equivocada. Un microdetalle solo vale la pena si se ve en el render final y en la pantalla de destino.

El 2D tiene la misma exigencia de oficio: forma de las letras, interletrado y saltos de línea; curvas y uniones; proporciones, espacio en blanco y peso visual; recorte, resolución y bordes de las imágenes reales. Un color plano, algo minimalista o un pizarrón pueden ser muy finos: detalle no es ponerle textura a todo.

Primero elige los estados representativos que exponen el mayor riesgo de oficio de este video y renderízalos de verdad a la resolución final. En una pieza espacial con cambios de escala, revisa la construcción en primer plano y la composición en plano completo; en una gráfica animada o un loop de composición fija, revisa su estado más denso, el más vacío o el cambio clave, sin forzar planos solo para revisar. Ponlos junto a la dirección aprobada o la referencia, anota las diferencias concretas y corrígelas antes de llenar todo el timeline. No hagas pasar un modelo gris de poca calidad por el estilo final, salvo que eso sea justo lo que eligió el creador esta vez.

## Escribe el ritmo como un recorrido visual

Para cada toma escribe «por qué mirar aquí» y luego elige el plano y el movimiento. La nota de trabajo de cada toma va corta:

`id de la toma | qué recibe el espectador | protagonista/foco | composición y plano al inicio y al final | acción del objeto | ruta de la cámara/intención de velocidad | asentamiento y pausa | cómo empalma con la siguiente`

La intención de velocidad de una toma se tiene que poder leer en una frase, como «baja rápido a la calle, sigue de cerca a la bici y frena hasta asentarse al llegar al anclaje vacío», y no un mismo smoothstep repetido en todo el video. El contraste entre tramos vecinos puede venir de rápido o lento, cerca o lejos, la dirección, la densidad de la imagen, el movimiento principal contra el secundario o el movimiento contra la quietud; elige según el contenido, sin una cuota de recursos que haya que juntar.

- Acercamiento: saca la evidencia de entre las relaciones; la posición del protagonista y la composición donde se asienta tienen que estar claras.
- Alejamiento: revela a qué sistema pertenece el detalle; al abrir tiene que aparecer de verdad información nueva.
- Desplazamiento lateral / seguimiento: el espectador acompaña un evento; el paralaje de lo que está más cerca de la cámara ayuda a sentir la velocidad y el espacio.
- Subir, bajar o girar alrededor: revela estructura, oclusiones o relaciones espaciales que una vista plana no deja ver.
- Corte seco / corte en movimiento: cambia la pregunta que guía la mirada, el momento de la historia o la escala del relato. No hace falta inventar una transición vistosa para cada cambio.
- Quietud: deja que el evento termine, que la información se entienda o que la emoción aterrice. Al detenerse también tiene que haber una composición que valga la pena ver y un cambio que ya ocurrió.

Una toma rápida puede ser corta y decidida; una lenta tiene que sumar información o algo que valga la pena mirar. Cuando el video pide un ritmo variado, cuestiona un deslizamiento suave de principio a fin; aun así, el movimiento uniforme sigue siendo válido en un proceso de velocidad constante o en un tono claramente tranquilo. No conviertas en regla estética general el «mejor lento que rápido» de trabajos anteriores, ni intervalos entre tomas, límites de zoom o cuotas de cortes. Manda lo que el creador pidió explícitamente sobre el ritmo esta vez.

En tareas continuas, como usar una página web o leer un artículo, conserva primero lo que el espectador viene siguiendo: el cursor, el botón, el documento o el lugar en el texto. Define primero el empalme: dónde cae en el estado siguiente el foco del estado anterior y cómo llega ahí; cuando cambia el estado, no reinicies al mismo tiempo la composición, la escala y la dirección de la mirada. Puedes comprimir las esperas, pero cambiar la velocidad no es lo mismo que cambiar de imagen de golpe. Usa el corte seco solo cuando el video necesita cambiar la pregunta que guía la mirada y aun así es fácil ubicarse; si el creador ya señaló un salto, arregla primero la continuidad del espacio y de la acción, en lugar de meter más cortes para reforzar el ritmo.

Diseña primero dónde aterriza el movimiento; la curva de velocidad está al servicio de ese punto. Arrancar rápido, seguir, frenar en seco y amortiguar largo son decisiones distintas; no apliques una sola curva de easing a todos los objetos y a la cámara. El texto clave tiene que estar quieto y nítido cuando hay que leerlo; en un movimiento rápido no hace falta que se pueda leer en cada cuadro, pero un dato clave no puede pasar solo como un destello dentro del desenfoque de movimiento. Cuando agrupar u ordenar es la explicación misma, los nombres de los grupos, los números y el contenido se tienen que poder seguir; la capa fija de textos explicativos va aparte de la cámara de la escena y tampoco puede salirse del cuadro por accidente mientras algo se mueve.

## Haz primero el tramo más difícil y luego extiende

Convierte el cambio visual más importante en un tramo corto que se pueda reproducir, con el detalle real de la imagen. Si el video lleva movimientos de cámara, valida el cambio de punto de vista y dónde se asienta; si la cámara es fija, valida el estado de los objetos, la densidad de información o el empalme del loop, sin inventar cambios de punto de vista ni pausas de más. Usa la ruta de render final; no sustituyas el movimiento con un storyboard en PowerPoint ni con una descripción escrita.

Después de verlo de corrido pregúntate: ¿a dónde se lleva la mirada? ¿En qué momento aparece información nueva? ¿Dónde solo se desliza la cámara sin que el contenido avance? Aterriza el diagnóstico en códigos de tiempo. Si la referencia tiene contrastes claros de velocidad o de plano y tu prueba sigue siendo el mismo deslizamiento lento, reorganiza primero las tomas; no lo arregles acelerando todo.

Mientras produces, separa tres capas para no aplicar el parche equivocado:

1. Se ve barato: revisa construcción, materiales, iluminación, letras e integración de capas; no empieces por agregar movimientos de cámara.
2. Se ve aburrido: revisa que avance la explicación y que cambien el plano, la velocidad y los asentamientos; no empieces por agregar partículas decorativas.
3. No se entiende: revisa el foco, la identidad de los objetos, los datos y el tiempo de lectura; no empieces por amontonar narración.

En un video promocional, el material real fija los hechos y la identidad del producto, pero eso no quiere decir que el video solo pueda pasear una captura completa. Cuando hay que mostrar un cambio, puedes sacar de la página real una frase, un número o una tarjeta como capa independiente: que reciba el foco, se separe en capas, acepte la edición y regrese a su lugar. El texto y los datos de origen se quedan exactos, y el empaque del video se distingue de los controles reales; un efecto dramatizado nunca se hace pasar por una función nativa del producto. Conserva las referencias de la página y el regreso a su lugar: solo así las capas en el espacio y los cambios de velocidad ayudan a entender.

## La implementación tiene que dejar libertad creativa

Separa en capas el movimiento de la cámara y el de los objetos; separa la lista de tomas, los recursos de la escena y los eventos del producto. Las tomas se muestrean en tiempo absoluto, los cortes se registran de forma explícita y todo azar lleva semilla fija. Reproducir de corrido, hacer seek hacia atrás o volver a renderizar un solo cuadro tiene que dar el mismo estado.

Elige la herramienta según la imagen: SVG/Canvas para gráficos precisos; Three.js o 3D offline para perspectiva real, oclusión, materiales e iluminación; imágenes con licencia, grabación real y material generado, cada uno para lo suyo. No bajes la calidad visual a propósito para que quepa en los primeros formatos estructurados text/shape/image/chart. Las técnicas avanzadas pueden ir por código libre, dejando claro hasta dónde se garantiza que se puedan editar; después se construye el adaptador correspondiente.

Que el creador pueda pedir «esta bici», «este seguimiento», «quédate un tiempo más en el primer plano»; los ids de los objetos, los parámetros de cámara y el mapeo de tiempos los mantienen el agente y las herramientas. Lo que se vuelve parámetro son decisiones creativas, no solo colores y títulos. Después de cambiar materiales, construcción, la ruta de la cámara o el ritmo, vuelve a ver el video terminado real.

## Revisión estética y transferencia

Un revisor independiente recibe lo que pidió el creador, la dirección aprobada, las referencias y el video terminado real; al principio no le des notas de producción ni calificaciones de pruebas. Pídele defectos concretos con su ventana de tiempo: si la estructura o los materiales se ven toscos, si el foco está claro, si el ritmo es plano todo el tiempo o nervioso todo el tiempo, qué movimiento de cámara no ayudó a entender nada. Los cuadros fijos revisan el oficio y verlo de corrido revisa el ritmo; uno no sustituye al otro.

Poner la meta de «primer nivel» significa seguir iterando hasta resolver los problemas concretos, no ponerte tú mismo una calificación alta. Un video que el creador rechazó explícitamente ya no se puede llamar referencia de calidad; las pruebas técnicas siguen probando solo lo que ya probaban.

Para llevar un cambio a temas desconocidos, que un agente que no participó en escribir el skill haga y renderice el video de verdad, y luego lo revise alguien independiente. Si solo se rehízo la ciudad, solo se puede llamar mejora de la ciudad; si solo se escribió el storyboard, solo se puede llamar prueba de planeación. Un experimento controlado usa el mismo tema, herramientas, material, tiempo disponible y especificación de entrega, y los videos terminados se ven en orden aleatorio y anónimo; el autor no puede hacer de baseline ni de juez. Un éxito es evidencia de un caso; no prueba que todos los creadores vayan a lograr siempre trabajos de primer nivel.
