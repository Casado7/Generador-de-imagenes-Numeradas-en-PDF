# Publicación en Vercel

## Estado verificado

- Aplicación: https://rifa-estudio.vercel.app
- Panel: https://vercel.com/casado7s-projects/rifa-estudio
- Proyecto: `rifa-estudio`, espacio `casado7s-projects` (Hobby).
- Primer despliegue de producción: `dpl_832xU3fcdhTsxNaaXJFqZDJ58qgc`, estado READY, creado el 21 de octubre de 2026 (hora de Bolivia). El despliegue vigente se consulta en el panel.
- Repositorio conectado: https://github.com/Casado7/Generador-de-imagenes-Numeradas-en-PDF, rama de producción `main`.
- Cuenta CLI: `casado7`, Vercel CLI 65.0.0 instalada globalmente.
- Compilación con Node 24, pnpm 10.32.1, instalación con lockfile congelado y `pnpm build`.

`vercel.json` fija el preset Next.js y los comandos. La carpeta de salida la resuelve el adaptador de Next.js; no sobrescribirla con `out` aunque `next build` produzca una exportación estática. Los recursos locales de PDF.js se regeneran al compilar.

## Privacidad y actualización

`.vercelignore` excluye documentos generados, evidencias privadas, `.env*`, recursos regenerables, originales JPG/Python, dependencias y salidas locales. La inspección previa encontró 85 archivos de aplicación y ningún PDF o archivo de entorno. `.vercel/` y `.env.local` permanecen ignorados por Git; no publicar sus credenciales.

La publicación inicial se hizo desde el directorio local. Después se conectó este repositorio de GitHub al proyecto existente mediante `vercel git connect`. Las subidas a `main` inician la compilación y publicación de producción; las demás ramas y los pull requests generan vistas previas.

Flujo habitual:

```sh
git add <archivos>
git commit -m "Descripción del cambio"
git push origin main
```

Verifica el resultado del despliegue en el panel de Vercel o en las comprobaciones del commit de GitHub. No se necesitan tokens de Vercel ni GitHub Actions para este flujo. Para una publicación manual excepcional desde este equipo:

```sh
vercel deploy --prod --scope casado7s-projects --verify
```

Durante esta sesión hubo fallos TLS intermitentes en el transporte de la CLI. Se ejecutó la CLI con Bun y reintentos limitados a errores de negociación/conexión, manteniendo la validación TLS. El auxiliar utilizado está en `.verification/`, fuera del despliegue y del repositorio.

## Verificación de la aplicación publicada

- La CLI confirmó READY y HTTP 200 en el dominio público con el título esperado.
- 14 casos de Chromium correctos contra producción: carga y selección de páginas PDF, errores recuperables, cuatro giros, CropBox/UserUnit, coberturas, fuentes, editor, dúplex, PDF/PNG/ZIP, 300 ppp, fallback, privacidad, cancelación y lotes, móvil, teclado y EXIF.
- La prueba opcional del documento anual privado se omitió en producción; ya se comprobó en Docker. No se añadió dicho archivo al sitio.
- El worker PDF devuelve HTTP 200 como `application/javascript`; rutas de documentos generados, `.env.local` y evidencias devuelven 404.

## Integración de Vercel con Codex

Se siguió https://vercel.com/get-started.md. El plugin oficial `vercel@openai-curated`, versión 0.54.1, está instalado para el usuario, con 37 skills y el comando de estado presente. No se instaló el paquete alternativo de skills independientes.

Se añadió el servidor MCP global `vercel`, endpoint exacto `https://mcp.vercel.com`, conservando las otras entradas de `~/.codex/config.toml` y configurando `default_tools_approval_mode = "writes"` para las mutaciones. Su autenticación OAuth adicional no se pudo completar: `codex mcp login vercel` falló al descubrir los metadatos de OAuth por un error de red. No se ejecutaron `search_vercel_documentation` ni `list_teams` por MCP y no se certifica esa conexión. La lista de equipos de la CLI sí se verificó.

La integración queda instalada para las próximas sesiones; no se reinició Codex durante el despliegue. Este pendiente de MCP no afecta a la aplicación pública ni a la sesión autenticada de la CLI.
