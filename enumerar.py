from PIL import Image, ImageDraw, ImageFont
import os

def create_numbered_cards(front_image_path, back_image_path, start, end, rows, columns, spacing=10, output_folder="output_cards", y_offset=10):
    # Dimensiones de una hoja tamaño carta en píxeles (8.5 x 11 pulgadas a 300 DPI)
    carta_width, carta_height = 2550, 3300  # Puedes ajustar según la resolución deseada

    # Cargar imágenes originales
    front_image = Image.open(front_image_path)
    back_image = Image.open(back_image_path)
    img_width, img_height = back_image.size  # Asumimos que ambas imágenes tienen el mismo tamaño

    # Redimensionar la imagen de `alante` para que se ajuste a una hoja carta si es demasiado grande
    if front_image.width > carta_width or front_image.height > carta_height:
        front_image.thumbnail((carta_width // columns - spacing, carta_height // rows - spacing), Image.ANTIALIAS)
    img_width, img_height = front_image.size  # Actualizamos las dimensiones de la imagen

    # Calcular tamaño de cada hoja carta
    card_width = columns * img_width + (columns + 1) * spacing
    card_height = rows * img_height + (rows + 1) * spacing

    # Crear la carpeta de salida si no existe
    os.makedirs(output_folder, exist_ok=True)

    # Cargar una fuente para los números (ajustar tamaño según imagen)
    try:
        font = ImageFont.truetype("arial.ttf", 60)  # Tamaño aumentado de la fuente
    except IOError:
        font = ImageFont.load_default()  # Fuente por defecto si `arial.ttf` no está disponible

    current_number = start
    card_count = 1

    # Crear las hojas para la imagen de frente (sin numerar)
    front_cards = []  # Lista para almacenar las imágenes de frente
    while current_number <= end:
        # Crear una nueva hoja carta para el frente
        front_card = Image.new("RGB", (card_width, card_height), color="white")
        
        for i in range(rows * columns):
            if current_number > end:
                break
            
            # Calcular posición de cada imagen en la cuadrícula
            row = i // columns
            col = i % columns
            x = col * img_width + (col + 1) * spacing
            y = row * img_height + (row + 1) * spacing
            
            # Pegar la imagen de frente en la hoja sin numeración
            front_card.paste(front_image, (x, y))
            current_number += 1

        # Guardar la hoja de frente sin numerar
        front_output_path = os.path.join(output_folder, f"front_card_{card_count}.png")
        front_card.save(front_output_path)
        front_cards.append(front_card)  # Añadir a la lista de imágenes de frente
        print(f"Hoja de frente guardada en {front_output_path}")
        card_count += 1

    # Resetear el número para las hojas con imagen de atrás (con numeración)
    current_number = start
    card_count = 1

    # Crear una lista para las imágenes de atrás
    back_cards = []
    while current_number <= end:
        # Crear una nueva hoja carta para la imagen de atrás
        back_card = Image.new("RGB", (card_width, card_height), color="white")
        
        for i in range(rows * columns):
            if current_number > end:
                break
            
            # Calcular posición de cada imagen en la cuadrícula
            row = i // columns
            col = i % columns
            x = col * img_width + (col + 1) * spacing
            y = row * img_height + (row + 1) * spacing
            
            # Crear copia de la imagen de atrás y agregar el número
            numbered_image = back_image.copy()
            draw = ImageDraw.Draw(numbered_image)
            text = str(current_number)

            # Obtener el tamaño del texto y calcular la posición en el centro, aplicando el y_offset
            text_bbox = draw.textbbox((0, 0), text, font=font)
            text_width, text_height = text_bbox[2] - text_bbox[0], text_bbox[3] - text_bbox[1]
            text_x = (img_width - text_width) // 2
            text_y = (img_height - text_height) // 2 + y_offset  # Aplicar desplazamiento en Y
            
            # Dibujar el número en el centro, un poco más abajo
            draw.text((text_x, text_y), text, font=font, fill="black")
            
            # Pegar la imagen numerada en la hoja
            back_card.paste(numbered_image, (x, y))
            current_number += 1

        # Guardar la hoja con las imágenes numeradas de atrás
        back_output_path = os.path.join(output_folder, f"back_card_{card_count}.png")
        back_card.save(back_output_path)
        back_cards.append(back_card)  # Añadir a la lista de imágenes de atrás
        print(f"Hoja de atrás guardada en {back_output_path}")
        card_count += 1

    # Guardar las imágenes en un PDF intercalado
    pdf_output_path = os.path.join(output_folder, "cards_intercalated.pdf")

    # Mezclar imágenes de frente y de atrás
    intercalated_images = []
    for front, back in zip(front_cards, back_cards):
        intercalated_images.append(front)
        intercalated_images.append(back)

    # Guardar las imágenes intercaladas en un PDF
    intercalated_images[0].save(pdf_output_path, save_all=True, append_images=intercalated_images[1:])
    print(f"PDF guardado en {pdf_output_path}")

# Parámetros de ejemplo, puedes ajustar y_offset para mover el texto más abajo
create_numbered_cards("alante.jpg", "atras.jpg", start=1, end=700, rows=3, columns=3, spacing=10, y_offset=60)
