# PDF, giros y coberturas

Cambio `pdf-templates-and-rotated-numbering`, verificado el 21 de octubre de 2026. La motivación, requisitos, diseño y tareas están en `openspec/changes/pdf-templates-and-rotated-numbering/`.

## Uso

1. Cargar PNG/JPEG/PDF en cada cara. Para PDF, elegir una página en **Página PDF del frente/reverso**; el documento completo permanece en memoria y no se publica.
2. Colocar dos marcas de número para boleto y talón. Comparten la secuencia. Elegir **Giro del elemento** para cada una: horizontal, vertical hacia abajo, invertida o vertical hacia arriba.
3. Si el arte ya tiene números, añadir **Cobertura** y ajustar posición, ancho, alto y color. Las coberturas se imprimen entre el arte y las marcas nuevas. El selector permite recuperarlas aunque queden debajo de un texto.
4. Elegir papel, orientación, filas, columnas, márgenes y ajuste automático. Revisar la pestaña **Hoja** y descargar PDF, PNG o ambos.

Las coberturas son visuales para imprimir; no eliminan los objetos originales del PDF ni son una función de redacción segura. Documentos con contraseña no se admiten. Entrada máxima: 20 MiB y 500 páginas; vista PDF hasta 300 ppp, 20 MP y 10000 px por lado. El PDF exportado conserva el arte nativo; PNG usa la vista rasterizada.

## Geometría y arquitectura

Dominio y aplicación siguen sin depender de React, DOM, Zod, PDF.js o pdf-lib. El caso de uso comparte centro, contorno y origen girado de texto. La infraestructura normaliza CropBox, UserUnit y Rotate al incrustar la página original; primero materializa sus recursos para que el formulario embebido conserve el arte. La edición no cambia el archivo original.

El lector se carga bajo demanda. `scripts/prepare-pdfjs.mjs` prepara worker, mapas, fuentes y wasm de PDF.js 6.4.299 en `public/pdfjs/<versión>/` antes de desarrollo y build. Son recursos regenerables ignorados por Git y por el contexto Docker; la construcción los prepara desde el lockfile. Nginx sirve módulos `.mjs` como JavaScript y `.wasm` como WebAssembly. No hay CDN ni API de procesamiento.

## Evidencia

- 22 pruebas unitarias correctas: numeración, imposición, límites, giros, origen de línea base, coberturas, Zod y dependencias. Pasan también dentro de Docker Linux con comprobación de tipos, lint y build estático.
- Siete casos de Chromium nuevos verifican páginas, PDF inválido/protegido/vacío, selección de página, privacidad, cuatro orientaciones con CropBox y UserUnit, edición/capas de coberturas y el formato anual real. Los cuatro casos geométricos exportan y vuelven a importar el resultado y comparan colores de las esquinas para detectar pérdida, desplazamiento o rotación del arte.
- Los ocho casos previos también pasan: editor, dúplex, ZIP, PNG 300 ppp, fallback, privacidad, cancelación/lotes, móvil y EXIF. La primera pasada completa dio 14 correctos y una aserción desactualizada del mensaje de formato; se adaptó para incluir PDF y se repitió ese caso correctamente. Resultado: 15 casos distintos correctos, incluido el archivo anual.
- Con el documento anual de una página Carta horizontal, se importó directamente el PDF y se colocaron dos marcas rojas (0° y 270°) y dos coberturas blancas. Cinco boletos 042–046, cuatro por hoja, generan dos páginas; la segunda contiene solo el último boleto. Se comprobaron también medidas A4 vertical y la descarga combinada PDF/PNG.
- Se renderizaron y revisaron visualmente ambas páginas del PDF y el PNG de la primera hoja: las dos marcas coinciden, los números originales quedan cubiertos y las guías del editor no se imprimen. El formato original no se añadió al repositorio, al sitio ni a la imagen Docker. Las evidencias privadas quedan en `.verification/` y la muestra local en `output/pdf/`, ambas ignoradas y excluidas de Docker.
- El contenedor de producción funciona en 8080 con usuario 101 y estado healthy. No incluye evidencias, documentos seleccionados ni fuentes de la aplicación. La prueba de red/almacenamiento no detecta subidas, peticiones externas ni persistencia en localStorage, sessionStorage, IndexedDB o cachés de aplicación.

La regresión completa se ejecuta con `PLAYWRIGHT_BASE_URL=http://localhost:8080` y `pnpm test:e2e --project=chromium`. Para incluir el documento anual, definir además `LOTTERY_REFERENCE_PDF` con su ruta local. Sin esa variable solo se omite esa prueba privada.

Se mantiene la limitación del entorno Firefox documentada en `verification.md`; estos cambios se verificaron en Chromium. La verificación de impresión es digital, sin prueba física de impresora.
