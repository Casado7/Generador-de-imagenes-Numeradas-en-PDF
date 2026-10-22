# Spec Delta

## Purpose

Permitir utilizar páginas de documentos PDF como arte de boletos sin conversiones externas ni subida de archivos a un servidor.

## ADDED Requirements

### Requirement: Selección local de página

La aplicación SHALL aceptar PDF de hasta 20 MiB y 500 páginas para cada cara y permitir elegir una página por boleto, conservando también PNG y JPEG.

#### Scenario: PDF de una página

- **WHEN** se selecciona el formato de este año, que tiene una página
- **THEN** aparece su diseño completo en el editor y se usa una sola página como un boleto

#### Scenario: Documento con varias páginas

- **WHEN** el usuario elige otra página de un PDF
- **THEN** se actualizan el arte, su proporción y los resultados con esa página

### Requirement: Fallos recuperables y límites

La aplicación SHALL rechazar documentos corruptos, cifrados, excesivos o con geometría inválida con un mensaje en español, conservando la plantilla válida anterior. La vista rasterizada SHALL respetar los límites de píxeles existentes.

#### Scenario: Documento inválido

- **WHEN** se intenta cargar un PDF corrupto o protegido por contraseña
- **THEN** se informa del problema y se puede seleccionar otro archivo sin recargar

### Requirement: Exportación coherente y privada

La página elegida SHALL conservar su orientación, proporción y contenido en editor, hojas, PDF y PNG. Los archivos SHALL procesarse en memoria y los recursos del lector SHALL servirse localmente, sin subir ni persistir documentos.

#### Scenario: PDF e imágenes

- **WHEN** se exportan cinco boletos con cuatro por hoja
- **THEN** se obtienen dos páginas del tamaño elegido, con la última parcialmente ocupada y los dos números de cada boleto sincronizados

#### Scenario: Privacidad del formato real

- **WHEN** se importa y exporta el formato de este año
- **THEN** no se transmite su contenido a servicios externos ni se guarda en almacenamiento del navegador
