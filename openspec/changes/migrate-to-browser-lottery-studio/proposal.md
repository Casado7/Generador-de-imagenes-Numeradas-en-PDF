# Proposal

## Why

Preparar la lotería benéfica exige modificar cada año scripts Python para ajustar imágenes, posiciones y distribución. Una aplicación visual permitirá obtener archivos de impresión sin instalar Python ni editar código, manteniendo los archivos en el dispositivo.

## What Changes

- Crear una aplicación Next.js con TypeScript, interfaz en español, componentes y formularios oficiales shadcn/ui, avisos con Sonner y validación de archivos/configuración con Zod, preparada para alojamiento estático en Vercel.
- Cubrir las dos variantes heredadas: una imagen numerada en varias posiciones y frente/reverso en páginas alternadas. Añadir como variaciones del mismo editor numeración única, talón con número repetido y selección de la cara numerada, incluida numeración en ambas caras.
- Hacer del editor visual la pantalla principal: cargar imágenes locales PNG/JPEG y colocar, seleccionar, arrastrar, duplicar o eliminar números y textos fijos sobre cada cara. Ajustar fuente, tamaño, color y coordenadas con controles precisos y ver cada cambio inmediatamente, sin generar todo el lote.
- Configurar rango inclusivo, ceros iniciales y hasta cuatro marcas de número y cuatro textos fijos por cara. Las marcas repiten el identificador de la tarjeta; los textos permiten añadir datos comunes como el nombre del evento o el precio impreso.
- Configurar papel, orientación, tamaño físico de las tarjetas, cantidad por hoja mediante cuadrículas sugeridas o filas/columnas personalizadas, márgenes y separación. Mantener la proporción de las imágenes y avisar si la combinación no cabe o la resolución es insuficiente.
- Alternar entre una vista ampliable de la tarjeta y una vista navegable de las hojas completas, con muestra de distintos números y de las dos caras. La vista previa y la descarga deben compartir composición, tamaños y posiciones para que el usuario resuelva todos los ajustes desde la interfaz.
- Descargar un PDF con tamaño físico correcto, hojas PNG dentro de un ZIP, o ambos. Incorporar progreso y cancelación sin bloquear la interfaz.
- Procesar todo en memoria en el navegador, sin login, base de datos, subida de archivos ni persistencia de proyectos. Una recarga comienza una sesión nueva.
- Aplicar Clean Architecture con reglas puras de numeración, geometría e imposición, separadas de React y de los adaptadores de exportación.
- Incluir Docker y Compose para desarrollo reproducible y ejecución local de la compilación estática; mantener Vercel como destino de publicación, sin backend de procesamiento.
- Conservar los scripts y las imágenes originales como referencia; no incluir automáticamente esas imágenes en el sitio publicado.
- Fuera de alcance: cartones con combinaciones aleatorias de bingo, cobros, participantes, historial, colaboración, edición del arte base y despliegue público durante esta propuesta.

## Capabilities

### New Capabilities

- `ticket-composition`: editor visual de imágenes, modos de tarjeta, rango y elementos de numeración/texto configurables.
- `print-layout`: geometría física, cuadrícula, paginación, alineación de reversos y vista previa.
- `local-export`: PDF y PNG/ZIP locales, control del proceso, límites y ciclo de vida de los recursos.

### Modified Capabilities

Ninguna; el repositorio todavía no tiene especificaciones.

## Impact

Se añaden la aplicación web, configuración de compilación estática, Dockerfile con etapas, Compose, pruebas del motor y documentación de uso/publicación. Se prevén Next.js, React, TypeScript, Tailwind, shadcn/ui, Sonner y Zod; adaptadores de PDF y ZIP locales. No se crean API, servicios externos, credenciales ni almacenamiento. Los scripts Python siguen disponibles durante la migración; no se promete reproducir sus errores de tamaño, espaciado o alineación dúplex.
