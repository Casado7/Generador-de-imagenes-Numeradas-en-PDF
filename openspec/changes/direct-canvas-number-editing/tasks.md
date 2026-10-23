# Tasks

## 1. Geometría y límites de transformación

- [x] 1.1 Preparar envolventes tipográficas del rango y extraer la validación de cabida compartida sin dependencias de React/DOM; verificar equivalencia con la validación completa para prefijos, sufijos y 5000 identificadores mediante pruebas unitarias y la comprobación de arquitectura.
- [x] 1.2 Implementar geometría pura de tamaño proporcional con centro fijo, coordenadas locales giradas, límites de 6-72 puntos y cabida; verificar cuatro orientaciones, cruce del centro, límites junto al borde y marco táctil ampliado con pruebas unitarias.
- [x] 1.3 Implementar diferencia angular normalizada y ajuste de cuartos de vuelta con histéresis de 10°; verificar ambos sentidos, paso por 0°, estabilidad del umbral y rechazo de giro sin cabida mediante pruebas unitarias.

## 2. Estado de edición y gestos sobre el boleto

- [x] 2.1 Unificar las acciones de transformación, duplicado y eliminación en la presentación, conservando React Hook Form como estado canónico y los límites existentes; comprobar por navegador independencia entre dos marcas, sincronización del panel y bloqueo al eliminar la última marca o duplicar sobre el máximo.
- [x] 2.2 Incorporar un marco de selección con tiradores de tamaño y giro separados, escala de pantalla estable y zonas de 44 píxeles sin superposición; comprobar selección de números y textos de 6 puntos, zoom 50/100/150 %, escritorio y pantalla de 390 píxeles con pruebas de navegador y capturas inspeccionadas.
- [x] 2.3 Conectar arrastre de tamaño y giro mediante captura de un único puntero, conservando movimiento y selección existentes; verificar transformaciones reales con ratón y toque, centro fijo, zoom, orientación vertical y conservación del último estado válido.
- [x] 2.4 Añadir confirmación y cancelación del gesto, restauración con Escape o pointercancel, limpieza al cambiar cara/vista y bloqueo al exportar; verificar que eventos tardíos no modifican otras caras y que se libera la captura mediante pruebas de navegador.

## 3. Controles contextuales y ayuda

- [x] 3.1 Consultar documentación de shadcn y componer con componentes existentes una barra junto al lienzo para aumentar/disminuir, girar, duplicar y eliminar; comprobar valores visibles, nombres accesibles, uso con Tab/Enter/Espacio, límites deshabilitados y acceso táctil sin abrir campos.
- [x] 3.2 Mantener ajustes precisos disponibles como opción secundaria, añadir instrucciones breves de los gestos y avisos de cabida sin toasts repetidos; actualizar README con la edición directa y verificar desde el navegador el recorrido completo sin escribir tamaño o giro en inputs.

## 4. Comprobaciones de integración

- [x] 4.1 Verificar que PDF y PNG reproducen posición, tamaño, fuente, color y orientación confirmados y que no contienen marcos o tiradores; ampliar pruebas existentes de exportación con un número horizontal, otro vertical y un texto, inspeccionando las salidas renderizadas sintéticas.
- [x] 4.2 Ejecutar tipos, lint, pruebas unitarias y compilación mediante Docker, además de la suite Chromium y las comprobaciones táctiles; intentar Firefox según su disponibilidad real, documentar resultados y revisar capturas sin publicar documentos privados.
- [x] 4.3 Validar el cambio OpenSpec en modo estricto y contrastar los escenarios con la implementación y las evidencias; marcar tareas completadas solo cuando sus verificaciones hayan pasado y dejar documentada cualquier limitación real.
