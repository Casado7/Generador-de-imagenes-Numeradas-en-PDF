from PIL import Image, ImageDraw, ImageFont
import os


def create_single_page_numbers(image_path,
                               start,
                               end,
                               rows=3,
                               columns=3,
                               spacing=20,
                               output_folder="output_cards",
                               zero_pad=3,
                               left_rel=(0.10, 0.58),
                               right_rel=(0.77, 0.68)):
    """
    Crear una sola página (PNG + PDF) con una cuadrícula de `rows x columns`
    usando la misma imagen (`image_path`) y numerando cada tarjeta desde
    `start` hasta `end` (inclusive) con ceros a la izquierda.

    left_rel y right_rel son tuplas (x_rel, y_rel) con posiciones relativas
    dentro de cada tarjeta donde se colocará el número (valores entre 0..1).
    """

    os.makedirs(output_folder, exist_ok=True)

    base = Image.open(image_path).convert("RGB")
    iw, ih = base.size

    page_w = columns * iw + (columns + 1) * spacing
    page_h = rows * ih + (rows + 1) * spacing
    page = Image.new("RGB", (page_w, page_h), color="white")

    # Intentar fuentes comunes, si no, usar por defecto
    def load_font(size):
        for fname in ("arial.ttf", "Arial.ttf", "DejaVuSans.ttf"):
            try:
                return ImageFont.truetype(fname, size)
            except Exception:
                continue
        return ImageFont.load_default()

    # Tamaños de fuente relativos a la anchura de la tarjeta
    # Reducidos para que queden más discretos según petición
    left_font_size = max(12, int(iw * 0.06))
    right_font_size = max(18, int(iw * 0.14))
    left_font = load_font(left_font_size)
    right_font = load_font(right_font_size)

    draw_page = ImageDraw.Draw(page)

    current = start
    for i in range(rows * columns):
        if current > end:
            break

        r = i // columns
        c = i % columns
        x = c * iw + (c + 1) * spacing
        y = r * ih + (r + 1) * spacing

        # Copia de la tarjeta para dibujar los números
        card = base.copy()
        draw = ImageDraw.Draw(card)

        text = f"{current:0{zero_pad}d}"

        # Posiciones absolutas dentro de la tarjeta
        lx = int(iw * left_rel[0])
        ly = int(ih * left_rel[1])
        rx = int(iw * right_rel[0])
        ry = int(ih * right_rel[1])

        # Medir textos y centrar en los puntos relativos
        lbbox = draw.textbbox((0, 0), text, font=left_font)
        ltw = lbbox[2] - lbbox[0]
        lth = lbbox[3] - lbbox[1]
        lpos = (lx - ltw // 2, ly - lth // 2)

        rbbox = draw.textbbox((0, 0), text, font=right_font)
        rtw = rbbox[2] - rbbox[0]
        rth = rbbox[3] - rbbox[1]
        rpos = (rx - rtw // 2, ry - rth // 2)

        # Dibujar con trazo para mejor legibilidad sobre cualquier fondo
        draw.text(lpos, text, font=left_font, fill="black", stroke_width=2, stroke_fill="white")
        draw.text(rpos, text, font=right_font, fill="black", stroke_width=3, stroke_fill="white")

        # Pegar la tarjeta numerada en la página
        page.paste(card, (x, y))

        current += 1

    png_out = os.path.join(output_folder, f"page_{start:03d}_{end:03d}.png")
    pdf_out = os.path.join(output_folder, f"page_{start:03d}_{end:03d}.pdf")

    page.save(png_out)
    # Guardar también como PDF (una sola página)
    page.save(pdf_out, "PDF", resolution=300.0)

    print(f"Página guardada: {png_out}")
    print(f"PDF guardado: {pdf_out}")


if __name__ == "__main__":
    # Generar una sola página con 001..009
    create_single_page_numbers(
        image_path="version-sin-numeros.png",
        start=1,
        end=9,
        rows=3,
        columns=3,
        spacing=20,
        output_folder="output_cards",
        zero_pad=3,
        # Posiciones relativas: puedes ajustar si la colocación no queda exactamente
        # donde quieres. Valores (x_rel, y_rel) entre 0.0 y 1.0 dentro de la tarjeta.
        # Bajamos un poco el número izquierdo (y_rel aumentó de 0.58 a 0.66)
        left_rel=(0.10, 0.66),
        right_rel=(0.77, 0.68),
    )
