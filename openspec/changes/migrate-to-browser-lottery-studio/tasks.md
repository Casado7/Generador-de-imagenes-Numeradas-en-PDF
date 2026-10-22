# Tasks

## 1. Base web y entorno reproducible

- [x] 1.1 Crear Next.js App Router con TypeScript estricto, exportación estática, pnpm y lockfile, conservando scripts e imágenes heredadas; verificar instalación congelada y build que produzca `out/`.
- [x] 1.2 Preparar scripts de tipos, lint y pruebas del núcleo, además de la estructura de capas del diseño; verificar que los comandos se ejecuten y no existan rutas API ni acciones de servidor.
- [x] 1.3 Crear Dockerfile multietapa, `.dockerignore` y Compose para desarrollo y vista previa estática; verificar `docker compose config`, build y respuesta HTTP de los dos servicios en localhost.
- [x] 1.4 Documentar inicio con Docker, versiones, puertos y volúmenes de desarrollo; ejecutar las instrucciones documentadas y comprobar que la imagen final solo contenga la salida estática y el servidor necesario.

## 2. Motor de composición e impresión

- [x] 2.1 Implementar DTO y reglas puras de rango inclusivo, relleno, prefijo/sufijo y elementos por cara; verificar casos con cero, 1000 con relleno 3, dos caras, textos fijos y rangos inválidos mediante pruebas del núcleo.
- [x] 2.2 Implementar papel, orientación, tamaño automático/manual, márgenes, separación y ajuste proporcional; verificar con pruebas de medidas físicas, proporciones distintas y cuadrículas imposibles según `print-layout`.
- [x] 2.3 Implementar plan de páginas a demanda e imposición dúplex; verificar rango 0 a 200 en 4 por 2, última hoja incompleta y correspondencia de ambos bordes en vertical/horizontal.
- [x] 2.4 Definir puertos de métricas y exportación y tipos de mensajes de trabajo; verificar que dominio/aplicación no importen React, Next.js, Zod, DOM ni implementaciones PDF/ZIP.
- [x] 2.5 Documentar unidades, origen de coordenadas, ancla de textos y convención de volteo junto al módulo; contrastar ejemplos documentados con las pruebas del motor.

## 3. Entradas, fuentes y validación

- [x] 3.1 Implementar esquemas Zod de configuración y mensajes, con conversión explícita de entradas numéricas y reglas entre campos; verificar rechazo de vacíos, decimales, rangos invertidos, valores fuera de límite y mensajes incompletos.
- [x] 3.2 Implementar carga PNG/JPEG por etapas con firma, dimensiones, decodificación y orientación, conservando la imagen previa ante fallos; verificar archivos sintéticos válidos, corruptos, con MIME engañoso y superiores a los límites.
- [x] 3.3 Incluir las dos fuentes locales y sus licencias, métricas y cobertura de glifos; verificar acentos, prefijos largos, texto fijo y el identificador más ancho del rango sin depender de fuentes del sistema.
- [x] 3.4 Centralizar y documentar límites de archivo, imagen, papel, tarjetas, páginas, raster y salida descritos en diseño; verificar que se apliquen antes de las operaciones costosas cuando los datos estén disponibles.

## 4. Interfaz y editor visual

- [x] 4.1 Consultar CLI/documentación vigente de shadcn, inicializar componentes oficiales y añadir las piezas necesarias; revisar los archivos incorporados, formularios FieldGroup/Field, tokens semánticos y composición accesible, verificando tipos y lint.
- [x] 4.2 Conectar formularios shadcn con React Hook Form/Zod para imágenes, modo, rango, papel, capacidad y tamaños; verificar errores junto al campo, conservación del último valor válido y exportación deshabilitada ante configuración inválida.
- [x] 4.3 Implementar el editor SVG de tarjeta con selección, arrastre, zoom, añadir/duplicar/eliminar números y textos, panel de propiedades y controles de teclado; verificar interacción al cambiar zoom y cara, además de límites de elementos y posiciones.
- [x] 4.4 Implementar vista de hoja, navegación de páginas, selector de muestra, resumen y advertencias de resolución/dúplex; verificar actualización inmediata tras modificar letra, tamaño físico y cuadrícula, sin generar todo el lote.
- [x] 4.5 Integrar Sonner explícitamente, Alert, Progress y estados de carga/vacío; verificar mensajes generales de éxito/error/cancelación, ausencia de toasts durante arrastre y errores de campo correctamente vinculados.
- [x] 4.6 Documentar el flujo de edición autónoma y comprobarlo en escritorio, pantalla estrecha y teclado: cargar arte, colocar números/textos, ajustar tamaño/cantidad por hoja e inspeccionar ambas caras sin editar código.

## 5. Exportación y ciclo de vida local

- [x] 5.1 Implementar adaptador PDF con fuentes incrustadas, texto vectorial e imágenes reutilizadas; verificar tamaño físico y número de páginas, orden frente/reverso y numeración extrayendo el PDF generado con una entrada sintética conocida.
- [x] 5.2 Implementar PNG a 150/300 ppp, una página temporal por vez, y ZIP con índices ordenables; verificar Carta a 2550 por 3300 píxeles, correspondencia con el PDF y archivo combinado con PDF/carpeta PNG.
- [x] 5.3 Ejecutar exportación en worker con instantánea, progreso y transferencia de buffers; añadir fallback cooperativo de canvas y verificar tanto la ruta con OffscreenCanvas como su ausencia simulada.
- [x] 5.4 Implementar cancelación terminando el worker, descarte de respuestas tardías, límites de salida y limpieza de URL/bitmaps/buffers; verificar cancelación durante composición/empaquetado, fallo recuperable y una exportación posterior correcta.
- [x] 5.5 Documentar formatos, resolución, límites, pérdida de sesión al recargar e instrucciones de impresión al 100 %; contrastar los ejemplos de descarga e impresión con los archivos producidos.

## 6. Verificación integrada y preparación de publicación

- [x] 6.1 Comparar visualmente tarjeta, hoja, PDF renderizado y PNG con fuentes y medidas idénticas; verificar números en bordes, textos largos, dos marcas de talón y última hoja dúplex. Conservar evidencia sintética de la comprobación sin publicar imágenes heredadas.
- [x] 6.2 Ejecutar en Chromium y Firefox los flujos de una cara y dos caras, un caso de 700 tarjetas y varias exportaciones consecutivas; verificar interfaz disponible, errores recuperables y uso de recursos sin acumulación de resultados. Registrar cualquier navegador no disponible.
- [x] 6.3 Inspeccionar red y almacenamiento tras carga/edición/descarga y recargar la página; verificar ausencia de envío o persistencia de archivos/configuración y comienzo de sesión vacía.
- [x] 6.4 Ejecutar tipos, lint, pruebas, compilación estática e imagen Docker final, y revisar límites de dependencia de Clean Architecture; verificar rutas y carga de worker/fuentes en la versión estática servida por el contenedor.
- [x] 6.5 Documentar configuración de Vercel y comprobaciones previas a publicar, y actualizar README con el uso web manteniendo la referencia Python; verificar que los pasos describan despliegue estático sin servidor de procesamiento ni ejecución de Docker en Vercel.

## Workflow follow-up

- Revisar el resultado implementado antes de publicar en Vercel.
- Verificar el cambio frente a las especificaciones y archivarlo después de completar la implementación y sus comprobaciones.
