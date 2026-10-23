# Edición directa de números y textos

Selecciona una marca en la vista **Boleto**. Arrástrala para moverla, usa sus esquinas para cambiar el tamaño o arrastra el círculo superior para girarla. El tamaño conserva las proporciones de la fuente y el centro; el giro se ajusta a 0°, 90°, 180° y 270°.

La barra junto al lienzo ofrece aumentar/reducir un punto, girar a izquierda/derecha, duplicar y eliminar. Funciona con ratón, toque, Tab, Enter y Espacio. Los tiradores enfocados admiten flechas para ajustar tamaño o giro. Los campos de propiedades siguen disponibles para ajustes precisos y reflejan las transformaciones directas.

Escape o la cancelación del puntero restaura el estado anterior al gesto. Cambiar de vista o cara cierra el gesto y conserva cada cara por separado. La edición queda bloqueada mientras se genera una descarga.

El tamaño permanece entre 6 y 72 puntos y se limita antes de salir de la tarjeta, considerando todos los identificadores del rango, no solo el visible. Un giro sin cabida se rechaza con un mensaje junto a la barra. Cada marca mantiene su posición, tamaño y giro independientes, aunque repita el mismo número.

Los controles mantienen zonas de interacción de 44 píxeles al cambiar el zoom. El marco puede ser mayor que un número pequeño para separar los tiradores. Ese marco no altera el área impresa y no aparece en la vista de hoja, PDF o PNG.

Las coberturas conservan sus controles precisos de ancho y alto y el arrastre existente. Este cambio no añade escalado directo de coberturas ni giro libre. Tampoco cambia los límites del lote, almacenamiento o privacidad de la sesión.

## Verificación del 23 de octubre de 2026

- Tipos, lint, 31 pruebas unitarias y compilación estática comprobados en Docker. Las nueve pruebas nuevas cubren envolventes de 5000 identificadores con prefijos/sufijos, escalado, cabida, giros, umbrales y zonas táctiles.
- Suite completa Chromium: 18 escenarios correctos y una prueba opcional del PDF anual privado omitida al no establecer `LOTTERY_REFERENCE_PDF`. Tras ampliar la cobertura, dos pruebas dirigidas verificaron giro táctil nativo y cancelación al cambiar de cara. En conjunto, 19 escenarios distintos correctos, incluida la versión ampliada del escenario táctil.
- Gestos con ratón y eventos táctiles nativos, zoom 50/100/150 %, pantalla de 390 píxeles, sincronización con campos, duplicado/eliminación, Escape y cancelación del puntero comprobados mediante Playwright.
- Exportación PDF/PNG sintética revisada visualmente: tamaño y giro confirmados coinciden, con dos números independientes y un texto fijo; sin tiradores ni barras en los archivos.
- Firefox se intentó en este equipo y no pudo iniciar su proceso de Playwright (`browserType.launch: spawn UNKNOWN`). No se presenta como una prueba funcional superada de Firefox.
- Capturas y documentos sintéticos de comprobación permanecen en `.verification/`, ignorados y excluidos de la publicación. No se añadieron imágenes o rifas privadas al repositorio.

La geometría pura y su caché están en `application/element-transforms.ts`; los eventos y componentes permanecen en presentación. La validación del proyecto y el editor comparten las mismas envolventes y comprobación de cabida.
