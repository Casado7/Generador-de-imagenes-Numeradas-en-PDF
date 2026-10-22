# Spec Delta

## Purpose

Obtener archivos listos para imprimir desde el navegador, conservando el control del proceso y manteniendo privados los archivos de cada sesión.

## ADDED Requirements

### Requirement: Archivos y proyectos exclusivamente locales
La aplicación SHALL procesar imágenes, configuración y resultados en memoria del navegador, sin subirlos a servicios ni persistirlos en almacenamiento de aplicación. SHALL informar que una recarga pierde la sesión. Solo las descargas solicitadas por el usuario SHALL escribir los resultados en su dispositivo.

#### Scenario: Inspección de red y almacenamiento
- **WHEN** se seleccionan imágenes, editan tarjetas y exportan archivos
- **THEN** no hay peticiones con imágenes, configuración o resultados ni escrituras en localStorage, IndexedDB o cachés de aplicación

#### Scenario: Nueva sesión
- **WHEN** se recarga la página
- **THEN** comienza la configuración inicial sin imágenes ni recuperación del trabajo anterior

### Requirement: PDF con tamaño real
La aplicación SHALL descargar un único PDF con las dimensiones físicas de papel seleccionadas y las páginas en el orden mostrado en la vista previa. SHALL mantener imágenes y textos legibles sin rasterizar innecesariamente el texto ni ampliar el arte original para fingir mayor resolución.

#### Scenario: PDF de dos caras
- **WHEN** se exportan 10 tarjetas de dos caras con capacidad 9 por hoja
- **THEN** el PDF contiene cuatro páginas en orden frente 1, reverso 1, frente 2, reverso 2, con el tamaño de papel configurado

### Requirement: Hojas como imágenes
La aplicación SHALL permitir descargar todas las páginas como PNG en un ZIP con elección de 150 o 300 ppp, predeterminando 150. SHALL convertir las dimensiones físicas a píxeles con redondeo al entero más cercano y numerar los archivos en el mismo orden que el PDF, incluyendo la cara cuando corresponda.

#### Scenario: Carta a 300 ppp
- **WHEN** se exporta Carta vertical a 300 ppp
- **THEN** cada PNG mide 2550 por 3300 píxeles

#### Scenario: Orden inequívoco
- **WHEN** el trabajo contiene más de diez páginas
- **THEN** el ZIP conserva nombres con índices rellenos que se ordenan correctamente de forma alfabética

### Requirement: Selección de formato
La aplicación SHALL ofrecer PDF, imágenes y ambos. Al elegir ambos SHALL entregar un único ZIP que contenga el PDF y la carpeta de hojas PNG. Todos los formatos de un trabajo SHALL usar la misma configuración congelada al iniciar.

#### Scenario: Descargar ambos
- **WHEN** se selecciona ambos y se inicia una generación válida
- **THEN** una única descarga contiene el PDF y las mismas páginas como PNG

### Requirement: Progreso y cancelación
La aplicación SHALL mostrar etapas y progreso por páginas, impedir trabajos simultáneos y conservar una interfaz interactiva. SHALL permitir cancelar durante preparación, composición o empaquetado, sin descargar resultados incompletos y permitiendo iniciar otro trabajo.

#### Scenario: Cancelación
- **WHEN** se cancela un trabajo antes de terminar
- **THEN** se detiene el trabajo, no se descarga un archivo parcial y vuelven a habilitarse los controles

#### Scenario: Consistencia durante generación
- **WHEN** se inicia una exportación
- **THEN** se bloquean los cambios que afecten al trabajo hasta terminar o cancelar

### Requirement: Límites y recuperación de errores
La aplicación SHALL publicar y aplicar límites de peso, dimensiones de imagen, páginas y tamaño de salida. SHALL rechazar entradas superiores antes de decodificar o generar cuando pueda conocerlo, y detenerse con un mensaje recuperable si el presupuesto de salida se supera durante el trabajo. Los errores SHALL sugerir reducir el rango o la resolución.

#### Scenario: Imagen demasiado pesada
- **WHEN** se elige una imagen que excede el límite de archivo mostrado
- **THEN** se rechaza con un error comprensible sin descartar el trabajo válido previo

#### Scenario: Trabajo demasiado grande
- **WHEN** la configuración supera el límite de páginas
- **THEN** se informa del máximo admitido y no se inicia la generación

### Requirement: Limpieza de recursos temporales
La aplicación SHALL liberar recursos temporales al reemplazar imágenes, terminar, cancelar, fallar o reiniciar la sesión. SHALL conservar únicamente lo necesario para seguir editando el trabajo activo y permitir varios trabajos sucesivos sin mantener resultados previos.

#### Scenario: Exportar otra vez
- **WHEN** termina una exportación y se inicia otra con ajustes distintos
- **THEN** se conserva la configuración editable, se liberan los recursos del resultado anterior y el nuevo archivo refleja solo los ajustes actuales
