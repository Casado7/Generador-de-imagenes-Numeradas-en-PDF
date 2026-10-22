# Proposal

## Why

El formato real de este año llega en PDF con dos números `001`, uno girado. La aplicación debe permitir preparar ese archivo sin conversiones ni retoques externos.

## What Changes

- Importar una página de PDF local como plantilla de cada cara, con selección de página cuando tenga varias y validación recuperable.
- Girar números y textos en 0°, 90°, 180° y 270°, manteniendo posición, color y tamaño independientes.
- Añadir zonas de cobertura opacas con posición, tamaño y color configurables para ocultar la numeración del arte antes de imprimir la nueva.
- Mantener estas propiedades en el editor, la hoja, el PDF y las imágenes exportadas, conservando los ajustes de papel y distribución.
- Verificar el flujo completo con el PDF real sin incorporarlo a los recursos públicos ni al repositorio.

## Capabilities

### New Capabilities

- `pdf-templates`: importación privada de páginas PDF y uso consistente de la página elegida como arte de un boleto.
- `ticket-overlays`: orientación de números y textos y coberturas del arte con geometría consistente en vista previa y exportaciones.

### Modified Capabilities

Ninguna especificación principal existe todavía; la migración anterior permanece como cambio completado sin archivar. Se conservan sus contratos de composición, privacidad y exportación.

## Impact

Editor y formularios shadcn, validación Zod, geometría pura, adaptadores de lectura y exportación, worker y Docker. Se añade PDF.js servido localmente para la vista previa; pdf-lib conserva la página original en el PDF exportado. No se añade backend ni almacenamiento. Quedan fuera OCR, borrado destructivo de contenido, edición general de PDF y contraseña de documentos cifrados.
