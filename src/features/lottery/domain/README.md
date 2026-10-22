# Motor de impresión

El dominio contiene únicamente tipos y cálculos puros. Todas las posiciones físicas están en milímetros, con origen arriba a la izquierda. El tamaño de letra se configura en puntos; la conversión se hace al componer cada texto. El ancla de cada elemento es su centro, expresado entre 0 y 1 dentro de la tarjeta, independientemente del zoom.

La cuadrícula se centra dentro de los márgenes mínimos. El frente define la proporción física; cada arte se ajusta completo a ese rectángulo. Por ejemplo, una imagen 1000×500 con ancho manual de 60 mm produce tarjetas de 60×30 mm.

El rango es inclusivo: 0 a 200 en 4×2 produce 26 hojas, la última con una tarjeta. Los reversos reflejan celdas completas, nunca las letras: vertical/largo y horizontal/corto invierten columnas; vertical/corto y horizontal/largo invierten filas. El mismo criterio conserva huecos de la última hoja.

`calculateLayout` valida y resume, `planPage` obtiene una página sin materializar el lote. La capa de aplicación aporta métricas tipográficas mediante un puerto. Las pruebas del módulo contrastan estos ejemplos.

Los giros de texto son cardinales y horarios alrededor del centro. `renderPage` conserva el rectángulo horizontal para SVG/Canvas y calcula el origen de la línea base ya girado para PDF (con el eje Y invertido al dibujar). La validación intercambia ancho y alto para 90°/270° y comprueba todo el contorno. Las coberturas tienen dimensiones relativas al boleto y se componen aparte, siempre entre el arte y los textos, sin depender del orden en el editor.
