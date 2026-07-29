# Instrucciones para la IA (Prompt) - Procesamiento de Nuevos PDFs

Copia y pega el siguiente prompt en tu asistente de IA (Codex, ChatGPT, Claude, etc.) cuando necesites procesar un nuevo PDF de examen para agregarlo al banco de preguntas de la aplicación web.

---

**Copia desde aquí abajo:**

Eres un ingeniero de IA especializado en extracción de datos de documentos médicos y automatización de pipelines. Nuestra aplicación web en Astro procesa exámenes médicos de múltiple choice y los convierte en un `questions.json` validado. 

Acabamos de agregar un nuevo archivo PDF con preguntas en la carpeta `fuentes/pdf/` y necesitamos procesarlo siguiendo nuestra metodología estricta. Tu objetivo es recuperar las preguntas válidas y marcar la opción correcta para cada una.

**Metodología y Pipeline a seguir:**
1. **Conversión inicial:** Utiliza IBM Docling (o la herramienta de extracción que prefieras) para convertir el PDF a formato Markdown (`.md`).
2. **Extracción de marcas visuales:** Los PDFs originales suelen tener la respuesta correcta resaltada con color (amarillo, verde, naranja) en la capa vectorial del documento. Debes escribir/ejecutar un script en Python usando PyMuPDF (`fitz`) que:
   - Extraiga la coordenada vertical (`y0`) de todos los resaltados (tanto en `page.annots()` tipo highlight como en `page.get_drawings()`).
   - Extraiga la coordenada `y0` del texto de las opciones (buscando patrones como `^[a-eA-E][.)-]`).
   - Cruce las coordenadas para determinar qué opción exacta está resaltada.
   - Inyecte el tag `**[CORRECTA]**` al final del renglón de esa opción específica en el archivo Markdown generado.
3. **Parcheo Manual:** Revisa los logs de errores. Si el parser de Docling unió renglones o si el PDF tiene errores de tipeo (ej. dos opciones "C)" en la misma pregunta, o el texto de la opción "A-" pegado al enunciado de la pregunta), debes arreglarlo manualmente editando el Markdown.
4. **Conversión a JSON:** Ejecuta el script de conversión oficial del proyecto: `bun run convert` dentro de la carpeta raíz de la web. Este script lee los `.md`, detecta el tag de correcta, y vuelca los datos en `src/data/questions.json`.
5. **Validación:** Ejecuta `bun run validate` para verificar que todas las preguntas tengan exactamente una opción correcta y que el formato del JSON sea íntegro.

**Reglas Críticas:**
- Nunca alteres el texto de las preguntas, solo puedes arreglar fallos groseros de formato (como separar una opción que quedó en el mismo renglón que la pregunta).
- Nuestro conversor excluye automáticamente preguntas tipo "flashcard" (enunciado seguido directamente de una respuesta, sin múltiples opciones). No intentes forzar su inclusión, déjalas fallar como `no_options`.
- Verifica en el archivo `conversion-excluded-blocks.md` si alguna pregunta válida fue ignorada por un error de tipeo en el PDF, y arréglala.

Por favor, comienza analizando el nuevo PDF y procede paso a paso informando tus hallazgos.
