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
    # Usar el mismo tamaño para el número derecho que para el izquierdo
    right_font_size = left_font_size
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
    # No guardamos PDF por página aquí (el usuario quiere un único PDF con todas las imágenes)
    print(f"Página guardada: {png_out}")


def generate_pages_range(image_path, start, end, rows=3, columns=3, spacing=20, output_folder="output_cards", zero_pad=3, left_rel=(0.10,0.66), right_rel=(0.77,0.73)):
    """
    Genera múltiples páginas en bloques de rows*columns desde start hasta end.
    """
    per_page = rows * columns
    n = start
    while n <= end:
        chunk_end = min(n + per_page - 1, end)
        create_single_page_numbers(
            image_path=image_path,
            start=n,
            end=chunk_end,
            rows=rows,
            columns=columns,
            spacing=spacing,
            output_folder=output_folder,
            zero_pad=zero_pad,
            left_rel=left_rel,
            right_rel=right_rel,
        )
        n += per_page


def combine_page_pngs_to_pdf(output_folder="output_cards", pattern_prefix="page_", output_pdf_name="all_pages_001_200.pdf"):
    """Combina los PNGs `page_*.png` en un único PDF en orden alfabético (numérico)."""
    import glob

    png_paths = sorted(glob.glob(os.path.join(output_folder, f"{pattern_prefix}*.png")))
    if not png_paths:
        print("No se encontraron PNGs para combinar.")
        return

    images = []
    for p in png_paths:
        im = Image.open(p).convert("RGB")
        images.append(im)

    out_path = os.path.join(output_folder, output_pdf_name)
    first, rest = images[0], images[1:]
    first.save(out_path, save_all=True, append_images=rest)
    print(f"PDF combinado guardado: {out_path}")

    # Eliminar PDFs por página antiguos si existen (no necesarios)
    for pdf_file in glob.glob(os.path.join(output_folder, f"{pattern_prefix}*.pdf")):
        try:
            os.remove(pdf_file)
        except Exception:
            pass


if __name__ == "__main__":
    # Generar todas las páginas desde 001 hasta 200 en bloques de 3x3
    generate_pages_range(
        image_path="version-sin-numeros.png",
        start=1,
        end=200,
        rows=3,
        columns=3,
        spacing=20,
        output_folder="output_cards",
        zero_pad=3,
        # Posiciones relativas: ajustar si es necesario
        left_rel=(0.10, 0.66),
        right_rel=(0.77, 0.73),
    )
