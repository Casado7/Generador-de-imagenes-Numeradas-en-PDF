# Design

## Context

Ver `proposal.md` para la motivación y `specs/` para el contrato observable. El repositorio contiene dos scripts Pillow, imágenes JPG y un README; no existe una aplicación web. Los scripts mezclan composición, reglas, geometría y escritura en disco. La nueva aplicación debe funcionar sin Python y mantener los datos del usuario en memoria del navegador.

Este diseño es necesario por la migración completa de plataforma, el editor interactivo, las exportaciones y la gestión de recursos. Docker está instalado en el equipo; su motor y las imágenes se comprobarán durante implementación.

## Goals / Non-Goals

**Goals:**
- Obtener un plan de composición determinista que compartan vista previa, PDF y PNG.
- Mantener la interacción disponible durante trabajos largos y permitir cancelarlos incluso al serializar el PDF.
- Hacer reproducibles instalación, desarrollo, pruebas y compilación mediante Docker y un lockfile.
- Aislar reglas y formatos externos para probar numeración y geometría sin navegador.

**Non-Goals:**
- Construir un editor gráfico general, rotar elementos libremente, editar píxeles o cargar fuentes arbitrarias.
- Replicar los cálculos defectuosos de los scripts o garantizar registro físico idéntico en todas las impresoras.
- Introducir repositorios de datos, servicios backend, contenedores de procesamiento o un gestor global de estado sin necesidad.

## Decisions

### 1. Next.js estático con un editor cliente

Usar App Router, TypeScript estricto y `output: export`. La estructura inicial se genera estáticamente; el editor es una frontera cliente y los módulos con APIs de navegador se cargan dentro de esa frontera. No habrá API routes ni Server Actions. Las imágenes del usuario se muestran con URL de objeto local, sin pasar por optimización remota.

Elegir versiones estables compatibles al implementar, fijarlas en el lockfile y usar pnpm como gestor. No fijar ahora versiones de bibliotecas que todavía no se han instalado. Alternativas: Vite simplificaría una SPA, pero Next.js fue solicitado; usar funciones de Vercel añadiría transferencia y límites sin aportar una capacidad necesaria.

### 2. Clean Architecture proporcional al proyecto

Estructura prevista:

```text
src/
  app/                         # composición de la página y layout
  components/ui/               # componentes obtenidos con shadcn CLI
  features/lottery/
    domain/                    # secuencia, tarjetas, elementos, geometría, imposición
    application/               # preparar composición y coordinar exportación; puertos
    infrastructure/            # imágenes, métricas/fuentes, PDF, canvas, ZIP, worker
    presentation/              # editor, formularios, estado de sesión, errores
public/fonts/                  # fuentes propias de la aplicación y licencias
```

El dominio usa números, cadenas y DTO sencillos; no importa React, Next.js, Zod, PDF, `File`, canvas o Worker. Aplicación depende del dominio y define puertos pequeños para métricas tipográficas y ejecución de exportación. Infraestructura implementa esos puertos; presentación traduce entradas y conecta adaptadores en un único punto de composición. Los buffers y archivos del navegador viven en los adaptadores, identificados mediante referencias simples en el modelo. No crear capas de repositorios, contenedores de inyección ni clases por cada operación pura.

Alternativas: alojar todas las reglas en hooks hace difícil comprobar numeración sin React; una arquitectura empresarial de cuatro capas rígidas aumenta el mantenimiento sin beneficio aquí.

### 3. Formularios, validación y mensajes

Usar componentes oficiales `@shadcn`, obtenidos mediante CLI y revisados tras añadirlos. Consultar las referencias vigentes antes de implementar cada componente. Componer formularios con `FieldGroup`, `Field`, `FieldLabel`, `FieldDescription` y `FieldError`, asociados a Input, Select, Slider o ToggleGroup. React Hook Form con resolver Zod coordina validación y edición; los cambios válidos se proyectan al modelo del editor. Durante un valor temporalmente incompleto se mantienen los últimos datos válidos y se muestra el error correspondiente.

Los esquemas Zod pertenecen al adaptador de entrada, validan tipos, rangos, relaciones entre campos y mensajes del worker, y producen DTO del núcleo. Validar archivos en etapas: peso y tipo declarado, firma/contenedor y dimensiones, decodificación efectiva y orientación; comprobar de nuevo reglas invariantes antes de componer. Una extensión o MIME válido no basta. No aceptar un campo numérico vacío como cero por coerción accidental.

Usar **Sonner explícitamente** para éxito, fallo general y cancelación, con un solo Toaster. Los errores de campo permanecen junto a su control; los avisos de impresión y resolución usan Alert; el progreso persistente usa Progress y texto de estado. Si el registro actual ofrece otro sistema de toast, conservar Sonner como dependencia e integración solicitada. No emitir un toast por cada movimiento del editor.

### 4. Editor visual y modelo de elementos

Una zona de configuración, un área central de tarjeta/hoja y un panel de propiedades del elemento seleccionado. En pantallas estrechas se apilan o abren con Sheet, conservando acciones accesibles. Tabs alterna tarjeta y hoja; ToggleGroup alterna cara y modos; Card, Empty, Button, Select, Tooltip y Separator cubren superficies y controles. Usar tokens semánticos y composición indicada por la skill shadcn.

El lienzo de vista previa será SVG controlado por React: se justifica dibujo propio para el arte y elementos, manteniendo todos los controles y formularios con shadcn. No hace falta una biblioteca gráfica completa para hasta ocho textos por cara. Pointer Events y captura del puntero permiten arrastrar; las coordenadas etiquetadas ofrecen una alternativa de teclado. El zoom solo transforma la vista, nunca el modelo.

Cada elemento es `sequence` o `text`, con identificador, ancla central relativa a la tarjeta entre 0 y 1, fuente, tamaño en puntos y color hexadecimal. Hay hasta cuatro números y cuatro textos por cara; los números se resuelven con un único identificador por tarjeta. La cara no numerada puede contener textos fijos. El selector de muestra permite inspeccionar cualquier número del rango. El arte base no se edita: se ajusta completo en el rectángulo físico y el usuario dimensiona la tarjeta.

Fuentes locales incluidas: Noto Sans y Noto Sans Mono en TTF con sus licencias. Cargar los mismos bytes en vista previa, canvas y PDF; esperar su disponibilidad y validar cobertura de caracteres. Un puerto de métricas proporciona anchos y ascenso/descenso para centrar y detectar desbordes; comprobar todos los identificadores de hasta 5000 tarjetas evita asumir que el último es el más ancho. No depender de Arial instalada o de Google Fonts en tiempo de ejecución.

### 5. Geometría común y dúplex

Calcular en milímetros con origen superior izquierdo, sin redondear antes del adaptador final. PDF convierte con `pt = mm * 72 / 25.4` e invierte Y; PNG usa `px = round(mm * ppp / 25.4)`; SVG aplica el viewBox del plan.

El tamaño automático usa el mínimo entre ancho y alto disponibles tras márgenes y separaciones, manteniendo la proporción del frente. El modo manual deriva el alto del ancho solicitado. La cuadrícula se centra sin sumar dos veces márgenes. Frente y reverso comparten rectángulos físicos; cada arte usa ajuste completo centrado, preservando proporciones.

El plan de página contiene dimensiones, imagen ajustada y textos resueltos con posición/base tipográfica y límites comunes. Generar páginas a demanda en lugar de guardar miles de páginas renderizadas. Para el reverso, reflejar columnas o filas según orientación y borde de giro; mover las celdas completas sin espejar letras o arte. En vertical, giro largo refleja columnas y corto filas; en horizontal, largo filas y corto columnas. Aplicar la misma transformación a posiciones vacías. Incluir un ejemplo de dos tarjetas distinguibles y una hoja final incompleta en las pruebas.

Alternativa descartada: concatenar una cuadrícula idéntica de reversos no garantiza correspondencia física, especialmente en la última hoja.

### 6. Exportaciones y capacidad de respuesta

`pdf-lib` y `@pdf-lib/fontkit` generan PDF con texto vectorial y fuentes incrustadas. Incrustar cada imagen una vez y reutilizarla; mantener bytes originales cuando su orientación lo permita y normalizar localmente cuando sea necesario. El adaptador PNG renderiza una página a la vez con fondo blanco, mismos elementos y fuentes. `fflate` empaqueta los PNG, ya comprimidos, sin recomprimirlos innecesariamente. Solo PDF entrega un `.pdf`; imágenes entrega un ZIP; ambos entrega un ZIP con PDF y carpeta PNG.

La exportación se ejecuta en un Web Worker dedicado, iniciado con una instantánea validada y un identificador de trabajo. Mensajes tipados: preparación, progreso por página, empaquetado, resultado y error. Para PNG, usar OffscreenCanvas si está disponible; el fallback usa canvas en el hilo de UI por lotes pequeños y cede control entre operaciones, manteniendo PDF/ZIP en el worker. Comparar métricas y ubicaciones entre SVG, canvas y PDF en verificación visual.

Cancelar termina el worker, descarta resultados tardíos y libera recursos. No basta con enviar un mensaje de cancelación a un worker ocupado serializando. Al completar, transferir buffers sin copias innecesarias, generar una URL de descarga y revocarla después de que el navegador pueda consumirla. Conservar solo los recursos necesarios para editar. Las entradas quedan bloqueadas durante el trabajo y vuelven a habilitarse tras cualquier salida.

Alternativas: rasterizar todo el PDF aumenta mucho su tamaño; procesar todo en el hilo principal dificulta la cancelación; guardar todas las hojas sin límites puede agotar la memoria.

### 7. Límites iniciales publicados

- Archivo: 20 MiB, 20 megapíxeles y lado de hasta 10000 píxeles por imagen. Leer dimensiones del contenedor antes de decodificar cuando sea posible y volver a verificarlas después.
- Trabajo: 5000 tarjetas y 500 páginas finales, contando ambas caras.
- Papel personalizado: de 50 a 600 mm por lado; tarjeta manual de al menos 5 mm de ancho, siempre sujeta a cabida.
- Raster: 32 megapíxeles por página; comprobarlo antes de crear canvas.
- Resultado: 128 MiB de bytes de salida acumulados, incluyendo componentes antes del ZIP; detenerse con error recuperable si se exceden. Mantener una sola página raster temporal y estimar el pico de memoria sin prometer que todos los equipos tienen la misma capacidad.

Centralizar estos valores, mostrarlos en la interfaz y documentarlos. Son valores iniciales conservadores y se verifican con un caso de 700 tarjetas como el script original. No usar la estimación del peso del archivo como garantía de memoria disponible.

### 8. Docker y publicación

Dockerfile multietapa con etapas de dependencias, desarrollo, comprobación/compilación y servidor estático. Usar una versión LTS compatible de Node y una versión fijada de pnpm; instalar con lockfile congelado. La imagen final sirve únicamente `out/` mediante Nginx sin privilegios en puerto 8080, sin Python, fuentes de proyecto ni herramientas de generación del lado servidor.

Compose ofrece desarrollo en localhost:3000 con recarga, volúmenes separados para dependencias Linux y caché de Next, y un perfil de vista previa de la imagen estática en localhost:8080. Los únicos volúmenes son código/dependencias de desarrollo, nunca archivos seleccionados por el usuario. `.dockerignore` excluye `.git`, `node_modules`, salidas, imágenes heredadas y archivos ajenos al build, sin excluir fuentes requeridas. Verificar desarrollo y producción con las mismas versiones y servir las rutas generadas explícitamente.

Vercel importa el proyecto Next.js y compila la exportación estática; no ejecuta la imagen Docker. La implementación dejará configuración y documentación listas. La publicación pública es un paso posterior separado de esta propuesta.

## Risks / Trade-offs

- [Consumo de memoria variable] → límites, un raster por vez, recursos reutilizados, cancelación real y errores recuperables; probar exportaciones repetidas.
- [Diferencias de tipografía entre renderizadores] → mismos TTF, métricas compartidas y comprobación visual de textos largos, acentos y bordes.
- [Navegador sin OffscreenCanvas] → detectar capacidad y usar fallback cooperativo; validar al menos Chromium y Firefox actuales y comprobar Safari cuando esté disponible.
- [Registro de impresora y nombres ambiguos de Oficio] → mostrar dimensiones, borde de giro e instrucciones de escala 100 %, y recomendar una prueba de una hoja.
- [Docker en Windows y volúmenes] → aislar dependencias Linux y comprobar recarga; documentar requisitos del motor sin alterar instalaciones globales.
- [Perder el trabajo al recargar] → aviso visible; no guardar proyectos automáticamente dado el requisito de no persistencia.

## Migration Plan

1. Preparar aplicación, dependencias, Docker y checks manteniendo los archivos Python intactos.
2. Implementar y verificar el motor puro con ejemplos representativos de ambos scripts y casos límite de impresión.
3. Añadir editor y adaptadores de exportación; comprobar equivalencia visual y privacidad con archivos sintéticos.
4. Verificar pruebas, tipos, lint, build estático e imagen Docker; documentar uso y publicación en Vercel.
5. Revisar antes de publicar. Un rollback de código usa el commit anterior; las descargas ya hechas permanecen en el dispositivo del usuario.

## Clean Architecture Review Report

### Summary
- Overall Assessment: Good para el diseño previsto; la implementación aún no existe.
- El riesgo principal es que los componentes del editor acumulen reglas de geometría o importen directamente el exportador PDF.

### Dependency Rule Analysis
Dominio sin dependencias externas; aplicación define límites; infraestructura y presentación dependen hacia dentro. Se revisarán imports al implementar, sin afirmar que el diseño equivale a una verificación del código.

### Layer Structure Review
- Entities: Good; DTO y funciones puras para secuencia, elementos y geometría.
- Use Cases: Good; composición y exportación con puertos pequeños.
- Interface Adapters: Good; formularios y Zod convierten entradas a DTO y errores legibles.
- Infrastructure: Good; DOM, fuentes, PDF, ZIP y worker quedan aislados.

### Recommendations
1. Comprobar invariantes del núcleo sin importar React o navegador.
2. Mantener una única transformación de composición compartida entre salidas.
3. Evitar capas y abstracciones de persistencia inexistentes.

## References

- [Next.js: exportación estática](https://nextjs.org/docs/app/guides/static-exports).
- [PDF-LIB: imágenes, fuentes y generación local](https://pdf-lib.js.org/).
- [fflate: archivos ZIP](https://github.com/101arrowz/fflate).
- [MDN: Web Workers y transferencia de mensajes](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers).
- [Zod: esquemas y validación](https://zod.dev/api).
- [Docker: contenedores y desarrollo Node.js](https://docs.docker.com/guides/nodejs/).
