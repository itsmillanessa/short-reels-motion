# Buena práctica: explicar el uso de un producto con encuadre continuo

Léelo cuando hagas una demo de producto, un flujo de trabajo entre dispositivos o un video corto de uso de una interfaz. La referencia es la [demo oficial de ChatGPT de dot delegando tareas a Codex](https://x.com/ChatGPT/status/2108636748217770180), publicada el 2026-10-09 y desarmada el 2026-10-10. Su valor está en el ritmo, la composición y el paso de la mirada de un lugar a otro; el fondo claro, las burbujas amarillas y la carcasa de los dispositivos son decisiones de ese video.

## Evidencia y alcance

El original es de 1920×1080, 30 fps, 732 cuadros de video, con una pista de video de unos 24.40 s. Las ventanas de tiempo de abajo cuentan desde 0 en el original y tienen límites aproximados; no son una lista de corte cuadro por cuadro. En esta ronda se revisaron cuadros muestreados de todo el video, secuencias a intervalos de 0.1 s alrededor de los empalmes clave y cuadros representativos a la resolución original; no se completó una revisión a velocidad normal ni una escucha, así que no se juzgan el easing exacto, los tiempos musicales, los efectos de sonido ni el software de producción. El video original trae pista de audio.

Lo «observado en la imagen» es lo que se ve en el original; el «método para llevarlo a otro video» son decisiones de implementación propuestas a partir de eso, todavía sin validar con un video terminado sobre un tema desconocido. El original es una demo promocional: sus tiempos de ejecución, sus cifras de pruebas y la forma de presentar la operación no prueban lo que el producto puede hacer. Con el skill se distribuyen el método y los enlaces a las fuentes; el original y los cuadros de evidencia se quedan en la carpeta privada de investigación del proyecto.

## Cómo organiza la mirada el original

- Aprox. 0.0–0.7 s: el teléfono completo al centro sobre fondo blanco; luego un acercamiento rápido que reencuadra en el campo de texto de abajo. Primero se reconoce el dispositivo y después la acción se vuelve la protagonista; que la mitad de arriba del dispositivo salga del cuadro es un recorte a propósito.
- Aprox. 0.8–3.8 s: la petición aparece letra por letra, el campo de texto crece con cada salto de línea y el primer plano prácticamente se queda quieto. El texto que cambia ya hace avanzar el evento; no hace falta que la cámara pasee al mismo tiempo. Al terminar de escribir hay una pausa corta antes de enviar.
- Aprox. 3.8–6.6 s: el campo se vacía y el mensaje entra a la conversación; el encuadre se abre al teléfono completo y aparece la respuesta. El primer plano explica «cómo se inicia»; la vista completa, «qué pasa después».
- Aprox. 6.6–7.5 s: el teléfono se mueve a la derecha, la ventana de escritorio aparece por la izquierda y se despliega, y al final quedan lado a lado, con el escritorio como principal y el teléfono como secundario. El teléfono y la petición amarilla se siguen reconociendo; la relación entre dispositivos la establece la composición, no una pantalla de título aparte.
- Aprox. 7.5–10.9 s: la cámara se mantiene casi fija, aparecen tres tareas una tras otra y el cursor va hacia una de ellas. El escritorio carga con la lectura y el teléfono sirve de referencia del origen; los dos dispositivos no compiten por la misma atención.
- Aprox. 11.0–12.8 s: clic en la tarea y aparece el detalle a la derecha; la imagen se acerca al detalle, el marco del escritorio y las otras conversaciones van saliendo, y solo queda la petición delegada con su estado. Primero se ve de dónde viene; luego se quita la carga visual de alrededor.
- Aprox. 13.8–16.4 s: aparecen el resumen del resultado y la lista de cambios, y la imagen se deja para leer; aprox. 16.4–17.1 s el contenido sube y entra la siguiente petición, abrir un PR. Pasados unos 18.3 s aparece el resultado terminado y la imagen se sigue quedando quieta. El scroll del contenido es lo que hace avanzar; el encuadre ya no cambia de escala a cada rato.
- Aprox. 20.4–20.8 s: el contenido se vacía y queda una pantalla en blanco breve; aprox. 20.9–21.3 s entra la tarjeta de notificación, se asienta y se queda hasta el final. La notificación reutiliza el mismo avatar del personaje y resume las tres tareas: cierra la petición del inicio con un resultado.

Es un recorrido visual de «vista completa → primer plano de la acción → vista completa → relación lado a lado → primer plano del detalle → notificación del resultado». Al llevarlo a tu video, conserva el orden de causa y efecto y vuelve a fijar los tiempos según tu cantidad de información; no tomes los 24 s, las tres tareas ni estos segundos como cuotas de plantilla.

## Ritmo: movimientos cortos, explicaciones largas, el evento trae la siguiente toma

Primero escribe los eventos del producto: empieza a escribir, termina de escribir, envía, responde, aparece una tarea, clic, aparece el resultado, notificación. Luego busca para cada cambio de encuadre el evento que lo dispara y el punto donde aterriza. Divide cada mirada en «moverse al foco → asentarse → entender / cambio de estado» y ajusta por separado la duración del movimiento y la de lectura: frenar todo junto alarga también los empalmes, y acelerar todo se come la lectura.

En esta referencia, el inicio y el reacomodo entre dispositivos son cortos, y escribir, desplegar las tareas y leer el resultado ocupan más tiempo. Puedes empezar probando un movimiento de encuadre simple de unos 0.3–0.8 s y luego ajustarlo según la pantalla de destino y la distancia a la que se ve; es un punto de partida para llevarlo a tu video, no el easing medido del original ni un rango para todas las tomas. Mientras la imagen está estable puede escribirse texto letra por letra, desplegarse una lista o actualizarse un estado: la imagen quieta sigue sumando información.

Una demo en orden encadena el cursor, la respuesta al clic y el estado nuevo. La espera antes del resultado se puede comprimir, pero no la cortes al grado de sugerir que «un clic y ya está»; si hace falta, deja el estado de «procesando» o marca que pasó el tiempo. Los tiempos de ejecución de la referencia son solo contenido de la imagen, no una medición del producto que estás mostrando.

## Composición: una sola zona principal de lectura a la vez

La vista completa sirve para reconocer el dispositivo y las relaciones; el primer plano, para leer el texto clave. En una toma lado a lado decide qué es principal y qué secundario: la ventana principal, lo bastante grande para leerse; del dispositivo secundario solo hace falta reconocer la misma petición u origen de la toma anterior. Cambia el foco solo cuando haya que leer el dispositivo secundario; no trates dos interfaces chicas como si las dos fueran el texto principal.

Conserva unas cuantas anclas de identidad: la misma petición, el avatar, el color de la burbuja, el título de la tarea. El fondo blanco y pocos toques de color de acento hacen fácil ubicar al sujeto; con otra marca usa sus elementos de identidad reales, sin copiar el amarillo ni el personaje. Los marcos, las esquinas redondeadas, el interletrado y las sombras suaves ayudan a separar la interfaz en capas; los reflejos fuertes y las sombras gruesas no sustituyen un texto nítido.

Para explicar, se vale recortar la carcasa del dispositivo o barras laterales que no vienen al caso. Solo cuenta como enfocar si antes y después del recorte se ubica el mismo foco y el texto clave queda completo; si lo más importante queda fuera del recorte, es un defecto. Revisa el tamaño de letra y los saltos de línea a la resolución real de salida y al tamaño en que se va a ver; el largo de línea del inglés de la referencia no se puede aplicar tal cual al español, que ocupa más.

## Movimiento de cámara: primero dónde aterriza, luego cómo llegar

Para cada empalme escribe una sola frase: `cuál es el foco de la toma anterior → a dónde llega en la siguiente → qué información nueva se ve gracias a eso`. Que el teléfono se haga a la derecha para dejarle lugar al escritorio es un reacomodo de objetos; agrandar el campo de texto es un encuadre plano; que el detalle se separe del marco del escritorio es extraer un nivel de información. No hace falta implementar todo eso como una cámara 3D.

Al implementarlo, separa cuatro capas: contenido y scroll de la interfaz; carcasa del dispositivo o de la ventana; la capa envolvente del encuadre; textos fijos y subtítulos. Una interfaz simple vista de frente se resuelve con DOM/SVG y transformaciones 2D; ajusta por separado la posición de los objetos y el zoom del encuadre, para que un salto de línea en el campo de texto no deforme también las proporciones del dispositivo. Sincronizar varias capas solo sirve para un paso de foco claro; no muevas todas las capas solo para dar sensación de movimiento.

Para un encuadre plano, calcula la traslación de la capa envolvente con el foco local en la capa `(fx, fy)`, el punto del cuadro donde debe caer `(vx, vy)`, la posición en el cuadro de la esquina superior izquierda de la capa cuando no tiene transformación `(bx, by)` y la escala `s`: `x = vx - bx - s * fx`, `y = vy - by - s * fy`. Esto supone que el origen de la transformación de la capa está arriba a la izquierda, que el punto local ya incluye el scroll del contenido y que el padre no tiene otra transformación sin contar; `bx/by` no se pueden reemplazar con los límites ya escalados o trasladados. `bx/by` valen 0 solo cuando la capa ya está en el origen del cuadro. La animación va desde la pose actual hasta este punto; no arranca cada vez desde el centrado por defecto. Para un objetivo cercano muchas veces basta con trasladar.

Cuando hay que sacar el detalle, que al principio coincida en posición, tamaño y texto con la interfaz original; cuando el espectador ya lo reconoció, desvanece el marco de alrededor o acércate. Los efectos de empaque se quedan como capas del video; no se hacen pasar por animaciones propias del producto. Con capturas de pantalla usa recortes o máscaras que coincidan; no borres el texto para escribir una respuesta que no existe.

El cierre con notificación puede ser una tarjeta aparte que retome el avatar o el nombre para regresarle el resultado a quien lo pidió. Aquí el original separa con una pantalla en blanco: no exige que todas las tomas se transformen sin costura. El blanco tiene que ser un punto final a propósito, no algo para tapar una carga fallida o cuadros que saltan.

Todas las poses salen del mismo timeline o de muestrear tiempo absoluto. El estado inicial de la capa envolvente en GSAP se fija de forma explícita; los `fromTo` posteriores llevan `immediateRender:false` cuando haga falta, para que un primer plano futuro no aparezca antes de tiempo en el primer cuadro. Un seek hacia atrás también tiene que restaurar el mismo contenido, recorte y posición de cámara.

## Llevarlo a la producción y a la revisión

Al arrancar una demo de producto, escribe con el material real una nota corta por toma:

`evento | zona de lectura actual | anclas de identidad que se conservan | composición al inicio y al final | acción del contenido/acción del encuadre | momento en que se asienta | ventana de lectura | información nueva de la siguiente toma`

Haz primero el tramo donde es más fácil perderse, como «dispositivo completo → lado a lado entre dispositivos → detalle de la tarea». Revisa el movimiento y la lectura con el material y las tipografías finales, y luego llena el video completo. La gramática `keynote-ui` que ya existe da títulos, tarjetas y resaltado de capturas; no garantiza por sí sola el reacomodo continuo entre dispositivos, el contenido con scroll ni sacar el detalle: si los necesitas, haz esas tomas en `blank` con código libre.

Al revisar, mira por separado:

- Tres cuadros representativos: si la vista completa se reconoce, si el lado a lado tiene principal y secundario, si el detalle es lo bastante grande para leerse. Compara con la referencia el peso visual, el espacio en blanco y el propósito del encuadre; usar los mismos colores y la misma tipografía no quiere decir que aprendiste la composición.
- Una secuencia corta de cada empalme: cómo pasa el foco viejo al nuevo, si cambian a la vez la posición, la escala y el contenido y obligan a volver a buscar el objeto; si los movimientos rápidos aterrizan en el lugar exacto.
- El video terminado a velocidad normal: si las ventanas de lectura alcanzan, si los tramos estables tienen contenido que avanza, si la cámara se adelanta a la acción del usuario, si la notificación responde la petición del inicio. Los cuadros muestreados no sustituyen esto.
- Sonido: sigue el flujo de música y efectos del skill principal y diséñalo según tus propios puntos de aterrizaje; esta vez no se escuchó la referencia, así que de ella no se saca un BPM ni una receta de sonido.

Llevarlo a otro video funcionó si un contenido desconocido también se entiende de punta a punta, desde la petición hasta el resultado. La primera vez se registra como «prueba»; después de una revisión independiente y de la opinión de creadores reales, lleva a `experience.md` lo que funcionó, las ventanas de tiempo que fallaron y el alcance; si aparece evidencia en contra, corrige esa conclusión, y no conviertas la receta de este video en regla fija para todas las animaciones.
