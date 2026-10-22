# Tasks

## 1. Geometría y contrato de elementos

- [x] 1.1 Añadir rotación cardinal y coberturas discriminadas con validación Zod; verificar límites y compatibilidad horizontal mediante pruebas unitarias.
- [x] 1.2 Calcular origen y contorno girados y planos de cobertura comunes; comprobar medidas, bordes y orden de capas con pruebas y documentar la geometría.

## 2. Entrada de PDF

- [x] 2.1 Añadir lector PDF local diferido, validación, selección de página y liberación de recursos; verificar PDF válido, corrupto, cifrado y con varias páginas en Chromium.
- [x] 2.2 Servir worker y recursos PDF.js de versión fija mediante preparación reproducible; verificar build/Docker y ausencia de solicitudes externas.
- [x] 2.3 Conservar página PDF nativa y preview para los exportadores; verificar CropBox y rotación con documentos sintéticos y documentar límites.

## 3. Editor y exportaciones

- [x] 3.1 Añadir controles shadcn para página, giro y coberturas, con selección, duplicado, eliminación, arrastre y teclado; comprobar formularios y vista previa en Chromium.
- [x] 3.2 Aplicar geometría y coberturas en SVG, Canvas y PDF, conservando arte nativo; verificar exportación PDF/PNG, casos girados y bloqueo por contorno fuera del boleto.
- [x] 3.3 Actualizar ayuda y README con flujo PDF, orientación y cobertura visual; comprobar instrucciones contra la interfaz real.

## 4. Integración real

- [x] 4.1 Ejecutar tipos, lint, pruebas unitarias y regresión Chromium, registrar resultados y validar OpenSpec en modo estricto.
- [x] 4.2 Reconstruir Docker y probar RIFA.pdf: dos números sincronizados, uno vertical, dos coberturas, tamaños de papel y varias páginas; inspeccionar visualmente PDF y PNG exportados y registrar evidencia privada fuera de recursos públicos.
