# Design

## Context

Ver `proposal.md` para la motivación. El editor es un SVG controlado por `Studio` y React Hook Form. `PreviewCanvas` ya convierte el puntero mediante `getScreenCTM().inverse()`, mueve elementos con captura de puntero y dibuja texto a partir de `RenderPage`. Las métricas de fuente, los límites de cabida y la geometría de exportación están en aplicación. La rotación del modelo y Zod solo admiten cuartos de vuelta. La vista de hoja utiliza el mismo componente con `editable=false`.

## Goals / Non-Goals

**Goals:**
- Extender el lienzo existente y mantener una sola configuración canónica compartida por gestos, panel y exportador.
- Separar geometría pura, ciclo de vida del gesto y componentes visibles para poder comprobar límites y cancelación sin mezclar DOM con reglas de composición.
- Mantener una respuesta fluida también con 5000 boletos, usando métricas reutilizadas y actualización de gestos como máximo una vez por cuadro.

**Non-Goals:**
- No sustituir SVG por una biblioteca de editor, ampliar los ángulos del modelo, rediseñar la distribución de impresión ni introducir persistencia.
- No añadir historial general de deshacer/rehacer, selección múltiple, gestos de dos dedos, edición directa del contenido textual o escalado de coberturas. La cancelación solo revierte el gesto activo.

## Decisions

### Una fuente de estado y cambios parciales

`Studio` conservará el estado del proyecto. Las acciones emitirán cambios parciales tipados de posición, tamaño o giro sobre un identificador y una cara, sin exponer SVG ni eventos a aplicación. El panel y la barra contextual usarán las mismas acciones de duplicar/eliminar y sus límites actuales. La alternativa de mantener una copia editable del elemento en cada componente se descarta por la divergencia entre vista previa, formulario y descarga.

### Marco de transformación con controles de tamaño estable

Un marco de selección separado se dibujará por encima de los elementos, con esquinas de tamaño y un control de giro desplazado hacia fuera. Las dimensiones visibles y áreas de interacción se calcularán a partir de la escala SVG-pantalla; se recalcularán al cambiar el contenedor o el zoom. Cuando una marca pequeña no deje espacio para zonas táctiles de 44 píxeles, el marco de interacción se ampliará en pantalla, sin alterar el texto ni su posición impresa, y el tirador de giro se separará del marco. La barra contextual irá fuera del SVG, inmediatamente junto al área de edición, con distribución adaptable. Así no recorta controles situados junto al borde del boleto ni oculta el texto con una barra flotante.

### Escalado uniforme alrededor del centro

El gesto registrará tamaño, giro, centro y vector inicial del tirador. El movimiento se convertirá al espacio local del elemento mediante la rotación inversa. La proyección sobre el vector inicial producirá un factor uniforme positivo, sin estirar letras ni invertir el elemento al cruzar el centro. El marco táctil ampliado tendrá su propio vector inicial para evitar saltos al empezar a arrastrar. El candidato se limitará a 6-72 puntos y a la cabida válida. Se conservará el centro en lugar de mover automáticamente la marca.

### Giro por cuartos con indicación visible

El gesto usará el ángulo alrededor del centro y su diferencia respecto al ángulo inicial, normalizada al cruzar -180°/180°. Se aplicará el cuarto de vuelta más cercano con histéresis de 10° en el umbral para evitar oscilaciones. La barra mostrará el ángulo efectivamente aplicado y ofrecerá botones de giro a izquierda/derecha. El giro libre exigiría modificar validación, geometría y exportadores, por lo que no se incluye.

### Cabida basada en métricas compartidas

Se reutilizarán las métricas de fuente y la comprobación de contornos girados de aplicación. Una función pura recibirá el elemento, sus dimensiones medidas y el tamaño de tarjeta para limitar o rechazar la transformación. Se preparará la envolvente máxima del rango al cambiar secuencia/fuente y se escalará linealmente al variar puntos, evitando recorrer 5000 valores por `pointermove`. El commit seguirá pasando por Zod y el análisis de composición existente; una prueba contrastará la envolvente con la validación completa. Los límites de tamaño podrán detenerse en el máximo válido; un giro que no cabe conservará el ángulo anterior con un aviso junto a los controles. No se mostrará un toast por cada movimiento.

### Ciclo de vida explícito del gesto

Se registrarán modo, pointerId, cara, id, valores iniciales y último estado válido. Solo el puntero activo podrá modificar el gesto. La captura mantendrá el arrastre aunque salga del tirador. `pointerup` confirmará; Escape y `pointercancel` restaurarán el estado inicial y liberarán captura. Cambiar cara o vista cancelará antes de modificar el contexto. Empezar a exportar cerrará la interacción y deshabilitará los controles. No se actualizará un elemento eliminado o de otra cara desde eventos tardíos.

### Componentes y accesibilidad

Reutilizar `Button`, `Tooltip` y los componentes instalados de shadcn, con nombres explícitos en español y valores actuales visibles; no depender del hover para conocer una acción. Los botones funcionarán con Tab, Enter y Espacio y permitirán ajustar tamaño/giro sin arrastre. Las flechas actuales seguirán moviendo la marca seleccionada. Los campos precisos seguirán disponibles y sincronizados. En implementación se consultarán la CLI y documentación de shadcn antes de componer componentes, así como las guías locales de Next.js antes de cambiar código.

## Risks / Trade-offs

- Controles superpuestos en números pequeños o cerca del borde → Marco táctil ampliado, giro separado, barra fuera del SVG y comprobaciones con 390 píxeles de ancho y zoom 50/100/150 %.
- Errores al transformar elementos a 90°/270° → Geometría pura y pruebas de centro fijo, vector local y paso por 0°.
- Cabida del número actual distinta de la del final del rango → Envolvente de todos los identificadores con métricas finales; la validación de exportación sigue siendo autoritativa.
- Recalcular el lote completo durante el arrastre → Caché de métricas/envolventes y un cambio por cuadro, comprobando un rango de 5000 identificadores.
- Modelos de puntero distintos entre navegadores → Pruebas de ratón, toque y cancelación; registrar cualquier limitación real de ejecución de Firefox sin darla por superada.

## Migration Plan

No hay migración de datos ni cambios del contrato de exportación. Implementar y verificar en Docker, comprobar gestos y descargas con documentos sintéticos y revisar capturas de escritorio/móvil. Las rifas privadas siguen en rutas ignoradas. La publicación conservará el despliegue automático de la rama de producción ya configurada, después de completar la implementación y sus comprobaciones. Una reversión del commit restablece el editor anterior.
