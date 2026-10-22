# Spec Delta

## Purpose

Distribuir tarjetas sobre hojas con medidas físicas explícitas y anticipar su impresión, incluidas la paginación y la correspondencia entre frente y reverso.

## ADDED Requirements

### Requirement: Papel y orientación físicos
La aplicación SHALL ofrecer Carta de 215,9 por 279,4 mm, A4 de 210 por 297 mm, Oficio de 215,9 por 330,2 mm y Legal de 215,9 por 355,6 mm, además de un tamaño personalizado. SHALL admitir orientación vertical y horizontal, mostrar las medidas y comenzar con Carta vertical.

#### Scenario: Cambiar orientación
- **WHEN** se cambia Carta de vertical a horizontal
- **THEN** la hoja mide 279,4 por 215,9 mm y se recalcula la distribución

### Requirement: Cantidad y tamaño de tarjetas
La aplicación SHALL ofrecer cuadrículas sugeridas de 2, 4, 6, 8, 9 y 12 tarjetas, y filas/columnas personalizadas de 1 a 10. SHALL permitir ajuste automático al espacio disponible o ancho físico manual con alto proporcional al frente. SHALL mostrar tarjetas por hoja, medidas resultantes y número de hojas y páginas.

#### Scenario: Tamaño manual
- **WHEN** se configura ancho manual de 60 mm y una imagen con proporción 2 a 1
- **THEN** la tarjeta mide 60 por 30 mm y se valida si cabe en la cuadrícula seleccionada

#### Scenario: Capacidad visible
- **WHEN** se configura una cuadrícula de 4 filas y 2 columnas para 201 tarjetas de una cara
- **THEN** se muestran 8 tarjetas por hoja y 26 páginas

### Requirement: Márgenes y geometría sin deformaciones
La aplicación SHALL permitir márgenes simétricos y separaciones horizontal/vertical no negativos en milímetros. SHALL centrar la cuadrícula, preservar la proporción del arte dentro de cada tarjeta y dejar fondo blanco en el espacio sobrante. SHALL bloquear combinaciones que no quepan o excedan límites de tamaño documentados.

#### Scenario: Imágenes de distinto tamaño
- **WHEN** el frente y reverso tienen proporciones distintas
- **THEN** ambas caras usan el mismo rectángulo físico de tarjeta y cada imagen se ajusta completa sin deformarse ni recortarse

#### Scenario: Cuadrícula imposible
- **WHEN** el tamaño manual de tarjetas más márgenes y separaciones excede el papel
- **THEN** se muestra qué ajuste impide la distribución y se bloquea la exportación

### Requirement: Paginación sin tarjetas adicionales
La aplicación SHALL llenar hojas de izquierda a derecha y arriba abajo según la secuencia. SHALL dejar vacías las posiciones restantes de la última hoja, sin imágenes, textos ni números adicionales, manteniendo el orden numérico de las páginas.

#### Scenario: Hoja final incompleta
- **WHEN** se generan 10 tarjetas en una cuadrícula 3 por 3
- **THEN** la primera hoja contiene 9 y la segunda solo 1, con las otras 8 posiciones vacías

### Requirement: Correspondencia dúplex configurable
En modo frente/reverso la aplicación SHALL producir frente 1, reverso 1, frente 2, reverso 2. SHALL ofrecer giro por borde largo y corto y colocar cada reverso en la posición que corresponde a su frente al voltear la hoja por ese borde. SHALL conservar las posiciones vacías equivalentes y mostrar instrucciones de prueba al 100 % de escala.

#### Scenario: Giro largo en vertical
- **WHEN** se usan 2 columnas, papel vertical y giro por borde largo
- **THEN** el reverso de la tarjeta superior izquierda ocupa la celda superior derecha del reverso de esa hoja

#### Scenario: Giro corto en vertical
- **WHEN** se usa papel vertical y giro por borde corto
- **THEN** el reverso invierte las filas correspondientes sin invertir las columnas

#### Scenario: Orientación horizontal
- **WHEN** se usa papel horizontal y giro por borde largo
- **THEN** la correspondencia invierte filas, y con giro por borde corto invierte columnas

#### Scenario: Última hoja dúplex
- **WHEN** una hoja tiene una sola tarjeta de frente
- **THEN** su reverso contiene una sola tarjeta en la posición correspondiente al giro elegido

### Requirement: Vista previa fiel y navegable
La aplicación SHALL permitir alternar entre tarjeta ampliada y hoja completa, elegir una tarjeta del rango y navegar páginas incluyendo sus caras. SHALL actualizar geometría, textos y numeración con cada cambio válido. SHALL usar las mismas posiciones y medidas de la exportación, excluyendo de los archivos guías y selección del editor.

#### Scenario: Ver un número diferente
- **WHEN** se selecciona el último número del rango en la vista de tarjeta
- **THEN** se ve su texto completo con las propiedades configuradas sin exportar el lote

#### Scenario: Ver el resultado por hoja
- **WHEN** se cambian filas, ancho o separación
- **THEN** la vista de hoja y el resumen se actualizan y coinciden con el archivo exportado

### Requirement: Advertencia de resolución
La aplicación SHALL mostrar la resolución efectiva del arte al tamaño físico seleccionado y advertir si es inferior a 150 ppp. La advertencia SHALL permitir continuar e indicar que ampliar la imagen no añade detalle.

#### Scenario: Arte pequeño
- **WHEN** se amplía una imagen de baja resolución hasta quedar por debajo de 150 ppp
- **THEN** aparece una advertencia sin impedir descargar
