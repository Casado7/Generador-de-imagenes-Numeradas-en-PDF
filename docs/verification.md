# Verificación de la migración

Comprobaciones realizadas el 21 de octubre de 2026 sobre el cambio `migrate-to-browser-lottery-studio`.

La ampliación posterior de PDF, giros y coberturas tiene su [informe de verificación](pdf-templates.md). Los resultados siguientes corresponden a la migración inicial.

## Resultados

- Instalación con lockfile congelado correcta, versiones directas fijadas y bases Docker fijadas por digest.
- TypeScript estricto y ESLint sin errores ni advertencias del código.
- 15 pruebas del núcleo, arquitectura, validación y exportación correctas, también ejecutadas dentro de Docker Linux.
- 8 casos de navegador en Chromium: editor con arrastre/teclado/zoom, geometría, dúplex, PDF, PNG a 300 ppp, ZIP combinado, fallback sin OffscreenCanvas, errores recuperables, privacidad, cancelación, 700 boletos, descargas sucesivas, pantalla de 390 px y JPEG con orientación EXIF.
- Compilación estática correcta, servida por Nginx en el contenedor de producción sin privilegios. Desarrollo Docker con respuesta HTTP correcta y descarga PDF/PNG comprobada con Turbopack.
- PDF leído con pypdf: dimensiones Carta, cuatro páginas dúplex para diez tarjetas, talones repetidos, acentos y última hoja correcta.
- PDF renderizado con Poppler y comparado visualmente con PNG y editor: misma composición, posiciones y tipografía, sin selección o guías del editor en la descarga.
- Inspección de red: ninguna petición con cuerpo o subida de imágenes/configuración. Las comprobaciones HEAD del framework no contienen datos del usuario. localStorage, sessionStorage, IndexedDB y cachés de aplicación vacíos; la recarga empieza sin imágenes.
- Los scripts y JPG originales siguen intactos. La imagen final no contiene esos JPG, Python, Node ni el código fuente.

Las pruebas generan archivos sintéticos locales en `.verification/`, `test-results/` y, si se activa, `playwright-report/`. Estas carpetas están ignoradas y no se publican. La suite se encuentra en `tests/studio.spec.ts` y se puede repetir contra el contenedor:

```powershell
$env:PLAYWRIGHT_BASE_URL = 'http://localhost:8080'
pnpm test:e2e --project=chromium
```

En Linux/macOS:

```sh
PLAYWRIGHT_BASE_URL=http://localhost:8080 pnpm test:e2e --project=chromium
```

## Límite de la comprobación entre navegadores

Firefox de Playwright 157.0 no puede iniciar en este Windows: el registro SideBySide informa que no encuentra el ensamblado dependiente `mozglue`, aunque el paquete incluye su DLL. El intento falla antes de abrir la aplicación. No se ha certificado el comportamiento de Firefox; la configuración y los mismos ocho casos quedan preparados para ejecutarse en un entorno compatible con `pnpm test:e2e --project=firefox`.

Safari no está disponible en este equipo y no se ha comprobado. Las pruebas de impresión son digitales; no sustituyen una prueba de registro dúplex en la impresora del usuario.

## Clean Architecture Review Report

### Summary

Overall Assessment: Good. Las reglas de numeración y distribución están separadas de React, Zod, DOM y PDF. No se han añadido abstracciones de persistencia ni backend.

### Dependency Rule Analysis

Dominio depende únicamente de módulos del dominio. Aplicación depende del dominio y define sus puertos. La prueba `architecture.test.ts` y reglas ESLint impiden dependencias hacia frameworks, presentación e infraestructura en el núcleo.

### Layer Structure Review

- Entities: Good; tipos y cálculos puros de secuencia, geometría e imposición.
- Use Cases: Good; preparación y composición con métricas proporcionadas por un puerto.
- Interface Adapters: Good; formularios traducen valores a DTO validados y errores de usuario.
- Infrastructure: Good; archivos, fuentes, PDF, canvas, ZIP y worker aislados.

### Recommendations

1. Conservar las comprobaciones de dependencias y los ejemplos de última hoja al ampliar funciones.
2. Mantener compartidas la geometría y las métricas para nuevas salidas.
3. Repetir la suite en Firefox cuando su entorno pueda arrancar y probar el giro con la impresora real antes de imprimir un lote.
