# Design

## Context

Ver proposal.md para motivación. La aplicación estática tiene geometría pura y adaptadores SVG, Canvas y pdf-lib. Los activos actuales son imágenes PNG/JPEG en memoria; los trabajos viajan a un worker local. El formato real tiene MediaBox de 792 × 612 pt y dos números rojos, uno girado.

## Goals / Non-Goals

**Goals:** mantener una geometría común y exportación privada, conservar el arte PDF en formato nativo cuando se descarga PDF y disponer de una vista rasterizada para editor y PNG.

**Non-Goals:** OCR, eliminación de objetos del documento, saneamiento/redacción de información confidencial, contraseñas, almacenamiento de proyectos o plantillas predeterminadas particulares de una fundación. Una cobertura es visual y el contenido original sigue en el PDF, como se explica en la ayuda.

## Decisions

1. PDF.js carga bytes locales en el cliente con importación diferida; su worker, fuentes, mapas y wasm se copian desde la versión fijada mediante un script reproducible antes de desarrollo/compilación. No usar CDN. PDF hasta 20 MiB y 500 páginas. Cada selección renderiza una página hasta 300 ppp, limitada a 20 MP y 10000 px por lado. Se destruyen lector y canvas tras preparar la imagen. Rechazar PDF cifrados explícitamente. Alternativa de convertir todo a PNG descartada para preservar texto y vectores en la descarga PDF.
2. El activo retiene PNG de vista previa más bytes PDF originales y página elegida como datos de infraestructura. El editor selecciona página sin persistir el documento; reemplazos atómicos y contadores de carga evitan resultados obsoletos. pdf-lib incrusta una sola página con su CropBox y rotación, una vez por cara; SVG y Canvas usan la vista previa normalizada. Los dominios no conocen PDF.js ni pdf-lib.
3. Un elemento discriminado distingue texto/número de cobertura. Rotaciones cardinales en sentido horario para texto; centro expresado en fracción del boleto. El caso de uso calcula límites y origen de texto girado en milímetros; los adaptadores traducen ese mismo resultado a sus coordenadas. Las coberturas tienen ancho y alto relativos y se dibujan siempre antes del texto. Máximo ocho coberturas, cuatro números y cuatro textos por cara.
4. Componer los controles shadcn existentes: selección de página y ángulo, campos de porcentaje y color, botón de cobertura y selector de elementos. Conservar drag, teclado, previsualización de hoja y flujo de descargas con Sonner y validación Zod.

## Risks / Trade-offs

- PDFs complejos o cifrados → errores recuperables, límites de memoria y prueba real, sin contraseña en esta versión.
- Diferencias de CropBox, Rotate y coordenadas → pruebas con páginas sintéticas recortadas/giradas y comparación renderizada de exportación real.
- Fuentes de la plantilla → recursos locales de PDF.js y arte original embebido en PDF; PNG usa la vista rasterizada con límite explícito.
- Rectángulo sobre un fondo no uniforme → color y tamaño ajustables; no se promete reconstrucción del fondo.
- Coberturas no borran información → explicación breve en ayuda; su finalidad es impresión, no redacción segura.

## Migration Plan

Añadir campos con valor inicial horizontal y conservar la configuración existente sin datos persistentes que migrar. Verificar pruebas unitarias, Chromium, build estático y Docker. Reconstruir el contenedor de vista previa en 8080 y probar RIFA.pdf desde Downloads sin copiarlo a public. Reversión mediante imagen anterior o cambios locales, sin migraciones de datos.
