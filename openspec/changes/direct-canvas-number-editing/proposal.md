# Proposal

## Why

Colocar un número en la rifa exige alternar entre la imagen y campos de tamaño o giro. El usuario necesita ajustar visualmente cada marca, como en un editor gráfico, sin aprender coordenadas ni depender del panel lateral.

## What Changes

- Selección visible de números y textos con tiradores para cambiar su tamaño directamente sobre la imagen, conservando las proporciones tipográficas.
- Tirador de giro con ajuste a 0°, 90°, 180° y 270°, coherente con los formatos de exportación actuales.
- Barra contextual junto al lienzo con tamaño actual, aumentar/disminuir, girar a izquierda/derecha, duplicar y eliminar; acciones disponibles también con teclado y toque.
- Los controles de coordenadas, tamaño exacto, fuente y color permanecen como ajustes de precisión, secundarios respecto a la edición directa.
- Gestos estables con zoom, límites de tamaño y de cabida, cancelación reversible y selección independiente de cada marca.
- Vista previa de hoja y descargas sin tiradores, barras ni contornos de selección.

## Capabilities

### New Capabilities

- `canvas-element-transforms`: selección y transformación directa de números y textos del boleto con puntero, toque y teclado, sincronizada con los ajustes precisos y la exportación.

### Modified Capabilities

Ninguna especificación principal: `openspec list --specs` no devuelve capacidades publicadas. Se conservan los contratos de los cambios completados `migrate-to-browser-lottery-studio` y `pdf-templates-and-rotated-numbering`, todavía sin archivar, sin renombrarlos ni duplicarlos como especificaciones principales.

## Impact

- Presentación: `canvas.tsx`, `studio.tsx` y `properties.tsx`; componente contextual reutilizando Button, Tooltip y otros componentes shadcn existentes.
- Geometría de interacción separada de React y DOM, reutilizando las métricas tipográficas y validación de cabida de la aplicación. No se introducen dependencias hacia presentación desde dominio o aplicación.
- Pruebas de geometría, interacción real en navegador, dispositivos táctiles y coherencia PDF/PNG. Docker sigue siendo el entorno reproducible de comprobación.
- Sin nueva biblioteca de editor, backend, persistencia, cambios de formato de configuración o ángulos de giro arbitrarios. Las coberturas conservan su edición actual; el escalado directo de coberturas no forma parte de este cambio.
