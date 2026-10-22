# Spec Delta

## Purpose

Permitir numerar diseños con orientaciones diferentes y ocultar visualmente numeraciones existentes con coberturas editables y reproducibles al imprimir.

## ADDED Requirements

### Requirement: Orientación independiente de elementos

El usuario SHALL elegir 0°, 90°, 180° o 270° para cada número o texto, girado alrededor de su centro y conservando su posición, tamaño y color. El mismo identificador SHALL repetirse en todas las marcas de un boleto.

#### Scenario: Talón vertical y boleto horizontal

- **WHEN** una marca se gira a 270° y otra permanece en 0°
- **THEN** ambas muestran el mismo número con sus respectivas orientaciones en el editor y en las descargas PDF y PNG

### Requirement: Coberturas configurables

El usuario SHALL añadir hasta ocho coberturas por cara, moverlas y editar su ancho, alto y color opaco. Se dibujarán sobre el arte y debajo de todos los números y textos añadidos, independientemente del orden de creación.

#### Scenario: Dos números originales

- **WHEN** se colocan dos coberturas blancas sobre los `001` impresos y se añaden las nuevas marcas
- **THEN** las numeraciones originales quedan visualmente ocultas y las nuevas permanecen visibles al exportar

### Requirement: Límites y edición consistente

La aplicación SHALL validar el contorno girado de números, textos y coberturas y bloquear la exportación si sobresale del boleto. Las coberturas SHALL ser seleccionables, duplicables, movibles y eliminables desde el editor.

#### Scenario: Texto vertical fuera del borde

- **WHEN** la rotación hace que parte de una marca quede fuera de la tarjeta
- **THEN** se muestra un error y la exportación queda bloqueada hasta corregirlo

#### Scenario: Cobertura reversible

- **WHEN** se elimina una cobertura
- **THEN** vuelve a verse el arte original sin modificar el archivo seleccionado
