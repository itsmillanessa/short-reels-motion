# Experiencia según el caso

## Composición y explicación

Primero pregúntate quién es el protagonista de esta toma, en qué tamaño de pantalla se ve, qué hay que leer y qué cambia entre antes y después. Diseña los cuadros clave en el formato real para detectar pronto el texto demasiado chico y la información apretada. Escribir «este botón de la mitad derecha de la captura» guía la implementación mucho mejor que «un look tecnológico impactante».

Separa el estilo de la composición: los mismos colores, tipografías y materiales admiten planos, distribuciones del espacio y movimientos distintos. Mezclar estilos es una decisión narrativa válida, pero la identidad de los objetos y qué concepto representa cada uno tienen que seguir claros. No hagas cada toma con la misma plantilla solo por mantener la unidad.

Junta el material real antes de diseñar; la interfaz, la forma del producto y el criterio de los datos también son hechos. Si algo falta, marca el hueco; no lo llenes con una interfaz falsa que muestre una acción que nunca pasó.

## Por qué se mueve un objeto

El movimiento más útil se describe con un verbo: juntar, separar, alinear, conectar, filtrar, revelar. Entender «qué cambió» tiene que depender sobre todo de cómo cambian los objetos, no de una narración que explique una animación que no tiene que ver.

Mantener el mismo objeto le ahorra al espectador el esfuerzo de reconocer cosas nuevas. Mantén un objeto protagonista (hero) en todo el video solo cuando la historia de verdad lo necesite; no conviertas «tiene que haber un hero» en meterle a fuerza una mascota a cada video.

Un speedrun de estilos de arte puede usar una acción principal más un loop que sale del propio material de la obra: el cielo estrellado que fluye, la tinta que se expande, bloques de color sobreimpresos. Las reacciones de una historia, el texto que se asienta y la lectura de datos pueden quedarse totalmente quietos. Cuánta superficie se mueve es una pista para diagnosticar, no una calificación de calidad.

Una transición puede salir del material característico de la escena siguiente: puntos de color que lo llenan todo, un papel que se despliega, líneas que se extienden; o puede ser simplemente la cámara moviéndose dentro del mismo mundo. Usa el corte seco sin más cuando tiene un papel claro de ritmo o de significado.

## Cámara y ritmo

Para cada movimiento escribe su objetivo concreto y su razón. Para la información de una captura, un zoom plano suele bastar; separa en capas con paralaje solo cuando vale la pena mostrar la relación entre lo de adelante y lo de atrás. Si dos focos vecinos están cerca, júntalos o haz un desplazamiento; no te alejes para luego volver a acercarte sin motivo.

Para encuadrar, calcula primero el recuadro del contenido clave y luego réstale el espacio de los subtítulos y los márgenes. Si la letra es lo bastante grande se revisa en la pantalla final de destino, no por el tamaño de fuente en el código ni por una escala fija.

En un tutorial tiene que verse claro dónde está cada cosa y qué resulta; un tono de ritmo rápido admite acercamientos cortos, barridos de cámara o cambios rápidos de escala. No hay una regla general de intervalo entre tomas, de límite de zoom ni de «mejor lento que rápido»; esos números dependen de la resolución del material, la cantidad de información, el tipo de video y lo que diga el creador.

Para enfatizar una acción, arranque rápido y asentamiento firme; el rebote, solo para objetos que necesitan peso o elasticidad. El movimiento a velocidad constante es válido para objetos que van a velocidad constante, fondos que se desplazan y cosas así. No existe una curva de easing que garantice que algo se vea premium.

## Sincronía de imagen y sonido

Si hay narración, confirma primero la pista de audio y los tiempos por palabra, y después diseña las revelaciones que van sincronizadas. Escribe el cue como «cuando dice esta palabra, el espectador ve el resultado»; no alinees solo el inicio de la acción: si algo entra volando en medio segundo, la acción empieza antes y el acento cae cuando se asienta.

Las pausas son para leer la imagen y razonar. Si la narración no tiene respiros, frenar la imagen no crea silencio para el oído; cambiar el audio tiene que caber en lo que el creador autorizó esta vez, y nunca se agregan ni se quitan por tu cuenta palabras que dijo el creador.

## Capas de implementación

Concepto y plan de tiempos → material y dibujo → animación de objetos → cámara → subtítulos → mezcla. Primero identifica en qué capa está el problema y luego cambia esa capa. Si falta oficio en la imagen, no rehagas el timeline; si la narración está demasiado apretada, no le pidas al animador que ajuste la cámara sin fin.

Para un estilo en canvas, entiende primero cómo se forma el material: la distribución de las pinceladas, los grupos de color por zona, el orden de capas entre papel y tinta. El material estático se puede cachear y la dirección de las pinceladas evoluciona de forma continua; volver a barajar el azar en cada cuadro produce parpadeo. Cuando se integra un personaje, unifica la luz o los materiales, y da prioridad a conservar la imagen original.
