# Rifa Estudio

Editor visual para preparar boletos numerados de rifas y loterías benéficas. Carga tu diseño, coloca números y textos, ajusta la hoja y descarga PDF o imágenes PNG.

Next.js, TypeScript, shadcn/ui, React Hook Form, Zod y Sonner. La generación ocurre en el navegador: sin login, base de datos, API de procesamiento ni subida de imágenes. Archivos y configuración se mantienen en memoria. **Recargar reinicia el trabajo.** Solo las descargas explícitas se guardan en tu dispositivo.

## Ejecutar con Docker

Requisitos: Docker Desktop con motor Linux y Docker Compose. No necesitas Python ni Node en el equipo anfitrión.

```sh
docker compose up --build dev
```

Abre [localhost:3000](http://localhost:3000). El código se monta para recarga automática. Los volúmenes `dependencies` y `next-cache` contienen dependencias y caché de desarrollo Linux; nunca archivos seleccionados por usuarios. Tras actualizar dependencias, ejecuta `docker compose run --rm dev pnpm install --frozen-lockfile` y reconstruye el servicio.

Versión compilada:

```sh
docker compose --profile preview up --build preview
```

Abre [localhost:8080](http://localhost:8080). La construcción comprueba tipos, lint, pruebas del motor y compilación. La imagen final sirve solo archivos estáticos con Nginx sin privilegios, sin Node, Python o código fuente.

```sh
docker compose --profile preview down
```

Detiene solo los servicios de este proyecto y conserva los volúmenes de desarrollo. Las descargas permanecen en tu equipo.

## Desarrollo sin contenedor

Node 24 LTS y pnpm 10.32.1:

```sh
corepack enable
corepack prepare pnpm@10.32.1 --activate
pnpm install --frozen-lockfile
pnpm dev
```

Las versiones están fijadas en `package.json` y `pnpm-lock.yaml`. Las fuentes Noto Sans y Noto Sans Mono se sirven localmente; licencia en `public/fonts/OFL.txt`.

## Preparar una rifa

1. Selecciona una cara o frente/reverso y carga PNG, JPEG o PDF. Si el PDF contiene varias páginas, elige la página del diseño; cada página se trata como un boleto completo. Puedes probar con el ejemplo sintético incluido.
2. Ajusta inicio y fin inclusivos, dígitos, prefijo y sufijo. De 0 a 200 con tres dígitos produce 201 boletos: 000 a 200.
3. En **Boleto**, selecciona y arrastra un número. Arrastra las esquinas para cambiar su tamaño sin deformarlo y el círculo para girarlo en pasos de 90°. La barra junto al lienzo permite aumentar/reducir un punto, girar, duplicar o eliminar con ratón, toque o teclado. Escape cancela el gesto activo; si alcanzas un borde, se conserva el último ajuste que cabe. Los controles mantienen su tamaño en pantalla al cambiar el zoom. El panel conserva los ajustes precisos de coordenadas, fuente, tamaño, color y giro. Las flechas mueven el elemento enfocado; Mayús amplía el paso. Añade hasta cuatro números repetidos para talones y cuatro textos fijos por cara. Cada número del mismo boleto lleva el mismo identificador, con posición, tamaño y giro independientes. Los tiradores no aparecen en la hoja ni en las descargas.
4. Elige papel, orientación, filas/columnas, márgenes y separación. Ajusta el tamaño automáticamente o elige ancho en milímetros; se conserva la proporción del frente. El reverso se ajusta completo al mismo rectángulo.
5. Revisa **Hoja**, incluyendo última página y reversos. El zoom solo cambia la pantalla, nunca el tamaño de impresión.
6. Descarga PDF, PNG o Ambos. Puedes cancelar sin descargar resultados parciales.

Los errores aparecen junto al campo o en un aviso general de configuración. La vista previa conserva los últimos valores válidos durante una edición incompleta. La advertencia de resolución inferior a 150 ppp permite continuar; ampliar una imagen no añade detalle.

Si el diseño ya tiene números impresos, pulsa **Cobertura**, ajusta su posición, ancho/alto en porcentaje y color (blanco inicialmente). Añade una para cada zona que quieras tapar y coloca los números nuevos encima. Las coberturas se dibujan siempre debajo de los textos añadidos; selecciónalas desde **Elemento seleccionado** si el número las tapa. Puedes duplicarlas o eliminarlas. Ocultan visualmente el arte para impresión: no eliminan contenido ni sirven para redactar información confidencial de un PDF.

La vista del PDF se prepara localmente hasta 300 ppp, limitada a 20 MP y 10000 px por lado. En la descarga PDF se reutiliza la página original con sus vectores; las imágenes PNG usan la vista preparada. No se admiten PDF con contraseña. Worker, fuentes y otros recursos del lector se sirven desde el propio sitio y se preparan automáticamente al ejecutar `pnpm dev` o `pnpm build`.

## Formatos e impresión

- **PDF:** un archivo con dimensiones físicas, imágenes reutilizadas y texto vectorial con fuentes incrustadas.
- **PNG:** un ZIP con páginas como `hojas/0001-frente.png`, a 150 o 300 ppp. Carta vertical a 300 ppp mide 2550 × 3300 píxeles.
- **Ambos:** un ZIP con PDF y carpeta de hojas PNG.

El PDF dúplex alterna frente 1, reverso 1, frente 2, reverso 2. Selecciona en la impresora el mismo giro por borde largo/corto que en el editor. Imprime a **100 % / tamaño real**, desactiva ajustar a página y prueba primero una hoja. El registro físico depende de la impresora.

Papel: Carta 215,9 × 279,4 mm; A4 210 × 297; Oficio de 13 pulgadas 215,9 × 330,2; Legal de 14 pulgadas 215,9 × 355,6; o personalizado.

## Límites

| Recurso                    | Límite inicial                                                   |
| -------------------------- | ---------------------------------------------------------------- |
| Archivo de entrada         | PNG/JPEG/PDF hasta 20 MiB; PDF hasta 500 páginas                 |
| Imagen / vista PDF         | 20 megapíxeles, 10000 px por lado                                |
| Numeración                 | Enteros 0–999999999; 5000 boletos                                |
| Relleno / prefijo / sufijo | 1–9 dígitos / 20 caracteres cada uno                             |
| Elementos por cara         | 4 números, 4 textos de una línea de 80 caracteres y 8 coberturas |
| Tipografía                 | 6–72 pt; sans serif y monoespaciada locales                      |
| Cuadrícula                 | 1–10 filas y 1–10 columnas                                       |
| Papel personalizado        | 50–600 mm por lado                                               |
| Tarjeta manual             | Ancho mínimo 5 mm; sujeto a cabida                               |
| Trabajo                    | 500 páginas, contando ambas caras                                |
| PNG                        | 32 megapíxeles por página                                        |
| Salida                     | 128 MiB acumulados antes del ZIP y de archivo final              |

Límites centralizados y comprobados antes de operaciones costosas cuando es posible. PDF y ZIP se procesan en un worker; PNG usa OffscreenCanvas o fallback cooperativo. Ante falta de memoria, reduce el rango, divide el trabajo o usa PDF/150 ppp. No todos los equipos tienen igual capacidad.

## Verificación

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm exec playwright install chromium firefox
pnpm test:e2e
```

Las pruebas cubren secuencia, geometría, paginación, dúplex, validación y exportación. La suite de navegador comprueba editor, descargas, cancelación, fallback, privacidad y nueva sesión. Los archivos de evidencia sintéticos se escriben en carpetas ignoradas; no incluyen imágenes reales de usuarios.

La prueba opcional del formato anual usa `LOTTERY_REFERENCE_PDF` con la ruta absoluta de un PDF local. Nunca se incluye ese archivo en el repositorio o en `public`; las descargas y capturas de esa prueba quedan en `.verification/`, ignorada y excluida de Docker. `tests/pdf.spec.ts` también usa documentos sintéticos para comprobar selección de página, PDF corrupto/protegido, CropBox, UserUnit, los cuatro giros y coberturas.

Usa `PLAYWRIGHT_BASE_URL=http://localhost:8080` para probar el contenedor estático, en lugar del servidor que inicia la suite.

## Arquitectura

`src/features/lottery/domain`: numeración y geometría puras sin React, DOM ni bibliotecas PDF. `application`: composición y puertos. `infrastructure`: imágenes, fuentes, esquemas de entrada, PDF, PNG, ZIP y worker. `presentation`: editor y formularios. Las salidas comparten posiciones y métricas. El README del dominio documenta coordenadas y volteo.

## Publicar en Vercel

La aplicación está publicada en [rifa-estudio.vercel.app](https://rifa-estudio.vercel.app). El proyecto `rifa-estudio` está conectado a este repositorio de GitHub: cada subida a `main` inicia un despliegue automático de producción y las otras ramas generan vistas previas. Consulta [la configuración y verificación del despliegue](docs/vercel.md).

`vercel.json` configura el preset Next.js. Se utiliza Node 24, instalación con `pnpm install --frozen-lockfile` y compilación con `pnpm build`. `output: export` produce archivos estáticos. No requiere secretos, almacenamiento, funciones ni ejecutar Docker allí. Docker sirve para desarrollo, pruebas y alojamiento estático alternativo.

Antes de subir cambios, ejecuta los checks y comprueba fuentes, worker y descargas en la vista previa de Vercel. Para volver atrás, revierte el commit o restaura una versión anterior desde Vercel.

## Scripts originales

Se conservan independientes de la web:

- `enumerar.py`: frente/reverso intercalados, reverso numerado.
- `enumerar_version_sin_numeros.py`: una cara, numeración repetida en dos posiciones.

Requieren Python y Pillow (`pip install pillow`), parámetros editados en el archivo y escriben en `output_cards/`. Las imágenes históricas de la raíz no se incluyen automáticamente en el sitio ni en Docker.

El seguimiento está en `openspec/changes/migrate-to-browser-lottery-studio/`.

Consulta [el informe de verificación](docs/verification.md) para los resultados y la limitación de Firefox en este equipo. Para comprobar solo Chromium, usa `pnpm test:e2e --project=chromium`; `PLAYWRIGHT_CHROME_CHANNEL=chrome` permite usar Chrome instalado en lugar del navegador de pruebas.
