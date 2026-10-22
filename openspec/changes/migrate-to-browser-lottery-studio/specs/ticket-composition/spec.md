# Spec Delta

## Purpose

Permitir preparar tarjetas numeradas desde imágenes locales y ajustar sus variantes habituales sin modificar scripts ni instalar herramientas de programación.

## ADDED Requirements

### Requirement: Selección de imágenes locales
La aplicación SHALL aceptar PNG y JPEG locales, validar su contenido y mostrar su vista previa. En modo de dos caras SHALL requerir una imagen por cara. Una selección inválida SHALL mostrar un error sin reemplazar la imagen válida anterior.

#### Scenario: Imagen válida
- **WHEN** se selecciona un JPEG decodificable
- **THEN** aparece la imagen con su orientación visual correcta y sus dimensiones

#### Scenario: Archivo inválido
- **WHEN** se selecciona un archivo corrupto o de formato no admitido
- **THEN** aparece un error en español y se conserva la selección válida anterior

### Requirement: Modos de composición
La aplicación SHALL ofrecer una cara y frente/reverso. En dos caras SHALL permitir numerar el frente, el reverso o ambos con el mismo identificador por tarjeta. Los cambios de modo SHALL conservar ajustes de la sesión y validar las imágenes necesarias antes de exportar.

#### Scenario: Variante heredada con reverso numerado
- **WHEN** se eligen dos caras y numeración solo en el reverso
- **THEN** los frentes no contienen marcas y cada reverso contiene el número de su tarjeta correspondiente

#### Scenario: Número compartido entre caras
- **WHEN** se numeran ambas caras
- **THEN** una tarjeta identificada como 042 muestra 042 en todas las marcas activas de las dos caras

### Requirement: Secuencia inclusiva y formato
La aplicación SHALL generar enteros consecutivos desde inicio hasta fin, ambos incluidos, admitiendo cero. SHALL permitir relleno de 1 a 9 dígitos sin truncar números y prefijo/sufijo de hasta 20 caracteres cada uno. El rango SHALL limitarse a enteros de 0 a 999999999 y un máximo de 5000 tarjetas por trabajo.

#### Scenario: Rango con ceros
- **WHEN** se configura inicio 0, fin 10, relleno 3 y prefijo B-
- **THEN** se generan 11 tarjetas de B-000 a B-010 en orden, sin omisiones ni duplicados

#### Scenario: Rango inválido
- **WHEN** el fin es menor que el inicio, hay decimales o se supera el máximo de tarjetas
- **THEN** se explica el error junto al control y se impide exportar

#### Scenario: Relleno inferior a la longitud
- **WHEN** el número es 1000 y el relleno es 3
- **THEN** se muestra 1000 completo

### Requirement: Marcas de numeración editables
La aplicación SHALL admitir entre una y cuatro marcas por cara numerada, cada una con posición relativa, fuente, tamaño de 6 a 72 puntos y color. SHALL permitir añadir, duplicar, quitar y mover marcas mediante puntero o controles etiquetados de coordenadas porcentuales. Las marcas activas SHALL repetir el mismo identificador de tarjeta.

#### Scenario: Talón con número repetido
- **WHEN** se añaden dos marcas en distintas posiciones de una cara
- **THEN** ambas muestran el mismo identificador y sus posiciones se mantienen al cambiar el tamaño de la tarjeta

#### Scenario: Ajuste accesible
- **WHEN** se cambian las coordenadas de una marca usando el teclado
- **THEN** la vista previa refleja la misma posición que se obtiene con el puntero

### Requirement: Validación de marcas completas
La aplicación SHALL impedir exportar cuando un identificador o texto fijo exceda los límites de su tarjeta. SHALL comprobar las dimensiones con la fuente final y el identificador más ancho del rango, e indicar qué elemento debe ajustarse. SHALL mostrar un error para caracteres no soportados por la fuente seleccionada.

#### Scenario: Texto fuera de la tarjeta
- **WHEN** una marca cercana al borde contiene un prefijo que hace desbordar el texto
- **THEN** se identifica la marca inválida y no se descarga un archivo con texto recortado

### Requirement: Textos fijos sobre la imagen
La aplicación SHALL admitir hasta cuatro textos fijos de una línea y 80 caracteres por cara, independientes de la secuencia. SHALL permitir editarlos, duplicarlos, moverlos y eliminarlos con los mismos controles de fuente, tamaño, color y posición de los números. Su contenido SHALL repetirse en todas las tarjetas.

#### Scenario: Nombre del evento
- **WHEN** se añade el texto fijo Rifa benéfica y se arrastra sobre la imagen
- **THEN** el texto aparece en esa posición en todas las tarjetas sin alterar su numeración

### Requirement: Editor visual de la tarjeta
La aplicación SHALL mostrar una vista ampliable de la cara activa, con selección de elementos, arrastre y panel de propiedades. SHALL ofrecer al menos una fuente sans serif y otra monoespaciada incluidas en la aplicación. Los cambios SHALL actualizar la vista previa sin generar el lote completo y mantendrán su posición al cambiar el zoom.

#### Scenario: Ajustar número directamente
- **WHEN** se selecciona un número, se mueve sobre la imagen y se cambia su tamaño a 18 puntos
- **THEN** se ve su nueva posición y tamaño inmediatamente, y las coordenadas del panel coinciden

#### Scenario: Zoom sin modificar composición
- **WHEN** se amplía la vista de la tarjeta
- **THEN** cambia el tamaño en pantalla pero se conservan las medidas y posiciones de impresión

#### Scenario: Cambiar de cara
- **WHEN** se alterna entre frente y reverso
- **THEN** se edita cada diseño por separado sin perder los elementos de la otra cara

### Requirement: Sesión utilizable en español
La interfaz SHALL ofrecer etiquetas, instrucciones y errores en español, controles con nombres accesibles y estados de validación vinculados al campo correspondiente. SHALL comenzar con una cuadrícula 3 por 3, rango 1 a 100 y relleno 3, permitiendo cambiar estos valores sin editar código.

#### Scenario: Primera visita
- **WHEN** se abre la aplicación sin imágenes
- **THEN** se muestran instrucciones para seleccionar el arte y la exportación permanece deshabilitada hasta completar una configuración válida
