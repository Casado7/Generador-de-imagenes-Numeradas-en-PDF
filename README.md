# Generador de Cartas Numeradas en PDF

Este proyecto genera cartas numeradas para impresión en PDF, permitiendo la creación de hojas de cartas con imágenes de frente y atrás. Las hojas se guardan en formato PDF intercalado, listas para imprimir en ambas caras.

## Características

- **Imágenes de Frente y Atrás**: Genera imágenes de frente sin numeración y de atrás con numeración secuencial.
- **Organización en PDF Intercalado**: Guarda las imágenes de manera que estén listas para imprimir con una cara numerada y la otra sin numerar.
- **Personalización**: Ajusta el tamaño, espaciado, cantidad de filas y columnas, y desplazamiento vertical del número de las cartas.

## Requisitos

- Python 3.6+
- Biblioteca `Pillow` para el manejo de imágenes.

Para instalar Pillow, usa:
```bash
pip install pillow
```

## Uso

### 1. Configura tus imágenes
Guarda las imágenes que deseas usar como frente y como atrás en el mismo directorio de este script o especifica sus rutas.

### 2. Ejecuta el script
Ajusta los parámetros de la función `create_numbered_cards` según tus necesidades. Aquí tienes un ejemplo:

```python
create_numbered_cards(
    front_image_path="alante.jpg",
    back_image_path="atras2.jpg",
    start=1,
    end=100,
    rows=3,
    columns=3,
    spacing=10,
    y_offset=60
)
```
- front_image_path: Ruta de la imagen de frente.
- back_image_path: Ruta de la imagen de atrás.
- start: Número inicial de la numeración.
- end: Número final de la numeración.
- rows y columns: Define la disposición en filas y columnas.
- spacing: Espaciado entre las imágenes.
- y_offset: Ajuste vertical del número para centrarlo mejor en la imagen.
