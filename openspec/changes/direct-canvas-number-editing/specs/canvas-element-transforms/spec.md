# Spec Delta

## Purpose

Permitir colocar, dimensionar y orientar números y textos directamente sobre la imagen de una rifa, manteniendo controles precisos, accesibilidad y correspondencia con la impresión.

## ADDED Requirements

### Requirement: Selección visual de una marca

El editor SHALL mostrar un contorno, tiradores de tamaño y un tirador de giro para el número o texto seleccionado. Solo la marca activa SHALL mostrar estos controles, sin ocultar su contenido.

#### Scenario: Dos números repetidos
- **WHEN** se selecciona la segunda marca de numeración
- **THEN** los controles corresponden a esa marca y la primera conserva su posición, tamaño, color y orientación

### Requirement: Tamaño proporcional con arrastre

El usuario SHALL cambiar el tamaño del número o texto arrastrando un tirador de esquina sin utilizar campos numéricos. El escalado SHALL mantener el centro, las proporciones de la tipografía y el giro de la marca, entre 6 y 72 puntos.

#### Scenario: Ampliar un número vertical
- **WHEN** se arrastra una esquina hacia fuera en una marca girada a 270°
- **THEN** la marca aumenta de tamaño, permanece vertical y centrada y no deforma los dígitos

#### Scenario: Alcanzar un límite de tamaño
- **WHEN** el arrastre supera los límites de 6 o 72 puntos
- **THEN** el tamaño se detiene en el límite permitido y no invierte ni oculta la marca

### Requirement: Giro directo con ajuste

El usuario SHALL girar la marca seleccionada mediante el tirador de giro sin abrir el selector lateral. El giro SHALL ajustarse a 0°, 90°, 180° o 270°, manteniendo el centro y mostrando la orientación aplicada.

#### Scenario: Pasar de horizontal a vertical
- **WHEN** se arrastra el tirador hasta la siguiente orientación de cuarto de vuelta
- **THEN** la marca se muestra a 90° conservando posición y tamaño, y el ajuste preciso de giro refleja 90°

### Requirement: Acciones contextuales accesibles

La selección SHALL habilitar junto al lienzo acciones de aumentar o disminuir tamaño en un punto, girar 90° a izquierda o derecha, duplicar y eliminar, con nombres accesibles en español y tamaño y giro actuales visibles. Las acciones SHALL actuar sobre la marca seleccionada respetando los límites existentes.

#### Scenario: Editar sin arrastre ni campos
- **WHEN** se activa aumentar tamaño y después girar a la derecha con teclado o toque
- **THEN** la marca aumenta un punto y gira 90° sin escribir en ningún campo

#### Scenario: No eliminar la última numeración
- **WHEN** solo queda una marca en una cara que requiere numeración
- **THEN** eliminar permanece deshabilitado para esa marca, igual que en el panel existente

### Requirement: Transformaciones y cabida

Las transformaciones directas SHALL respetar los límites de la tarjeta con las métricas de la fuente final y todos los identificadores del rango. Si una transformación deja de caber, SHALL conservarse el último estado válido sin desplazar automáticamente el centro ni afectar otras marcas.

#### Scenario: Ampliar junto al borde
- **WHEN** el siguiente tamaño haría que un identificador del rango excediera la tarjeta
- **THEN** la marca conserva el último tamaño válido y un aviso contextual indica el límite alcanzado

#### Scenario: Giro que no cabe
- **WHEN** el siguiente cuarto de vuelta no cabe en la posición actual
- **THEN** se conserva el giro anterior y se indica que debe moverse la marca hacia el interior

### Requirement: Gestos estables y reversibles

Los gestos SHALL funcionar con ratón, lápiz y toque, conservar su relación con el boleto al cambiar el zoom y distinguir selección, movimiento, tamaño y giro. Escape o la cancelación del puntero SHALL restaurar los valores anteriores al gesto. Cambiar de cara o salir del editor SHALL cerrar la interacción activa.

#### Scenario: Ampliar con zoom
- **WHEN** se cambia el tamaño con zoom al 150 %
- **THEN** el tamaño resultante refleja el arrastre sobre la tarjeta y no aplica dos veces el factor de zoom

#### Scenario: Cancelar un arrastre
- **WHEN** se presiona Escape durante un cambio de tamaño o el dispositivo cancela el puntero
- **THEN** se restauran posición, tamaño y giro anteriores al gesto y se libera la interacción

#### Scenario: Seleccionar sin transformar
- **WHEN** se pulsa y suelta una marca sin desplazar el puntero
- **THEN** queda seleccionada sin cambiar posición, tamaño o giro

### Requirement: Controles utilizables en móvil

Los tiradores y acciones SHALL mantener zonas táctiles de al menos 44 por 44 píxeles de pantalla, independientes del zoom. Las zonas de tamaño y giro SHALL poder activarse de forma distinguible y los controles contextuales SHALL permanecer dentro del área visible sin cubrir la marca seleccionada.

#### Scenario: Número pequeño en pantalla estrecha
- **WHEN** se selecciona una marca de 6 puntos en una pantalla de 390 píxeles de ancho
- **THEN** es posible activar por separado tamaño y giro, sin tener que abrir los campos de propiedades

### Requirement: Ajustes precisos sincronizados

La posición, fuente, tamaño, color y giro precisos SHALL seguir disponibles en el panel. Una modificación directa SHALL reflejarse en esos controles y viceversa. Cambiar una marca SHALL conservar el mismo identificador en todas las marcas de ese boleto, sin vincular sus transformaciones.

#### Scenario: Cambio desde el panel
- **WHEN** se establece un tamaño de 18 puntos en los ajustes precisos
- **THEN** la marca y sus tiradores reflejan ese tamaño y el siguiente gesto parte de 18 puntos

### Requirement: Edición y resultados coherentes

La vista de hoja y las salidas PDF y PNG SHALL reproducir la posición, tamaño, fuente, color y giro confirmados sin contornos, tiradores o barras. Durante la generación, las transformaciones SHALL permanecer deshabilitadas. Los archivos y ajustes SHALL continuar solo en memoria hasta su descarga explícita.

#### Scenario: Imprimir la marca editada
- **WHEN** se cambia el tamaño con un tirador, se gira y se descarga PDF y PNG
- **THEN** ambas salidas reproducen la marca editada sin controles de edición ni cambios en la numeración o la distribución de la hoja

#### Scenario: Generación en curso
- **WHEN** comienza la generación del lote
- **THEN** no se pueden cambiar las marcas hasta finalizar o cancelar la generación
