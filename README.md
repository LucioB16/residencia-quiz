# Residencias Médicas Córdoba · Quiz

**Una herramienta de práctica para repasar preguntas de exámenes de residencia, directamente desde el navegador.**

La web estática usa preguntas versionadas dentro del repositorio y permite revisar respuestas, resultados y tiempo por intento. No requiere una cuenta ni envía el historial a un servidor.

**[Empezar a practicar](https://luciob16.github.io/residencia-quiz/)** · [Consultar las fuentes](fuentes/) · [Agregar exámenes](#incorporar-nuevos-exámenes)

| Practicar | Corregir | Incorporar material |
| :-- | :-- | :-- |
| Preguntas en orden o aleatorias. | Feedback inmediato y resumen del intento. | Flujo documentado para convertir nuevos PDF al banco local. |

> [!NOTE]
> El archivo `src/data/questions.json` contiene actualmente **826 registros**. Se retiró el antiguo badge fijo de 409 preguntas, que ya no coincidía con los datos del repositorio.

## Funciones del cuestionario

- Conversor reproducible de archivos `.md` de Docling hacia `src/data/questions.json`.
- Heurística automática para detectar preguntas correctas con prefijo `## `.
- Inicio en orden original o aleatorio.
- Corrección inmediata por pregunta, con opción correcta visible si la respuesta es incorrecta o salteada.
- Resultado final con correctas, incorrectas, porcentaje y tiempo total.
- Ranking local del navegador sin guardar respuestas individuales.
- Deploy automático a GitHub Pages mediante GitHub Actions.

## Desarrollo local

Requisitos locales:

- Bun 1.3 o superior.
- Node.js compatible con Astro.

Comandos:

```bash
bun install
bun run convert
bun run validate
bun run dev
bun run build
```

## Incorporar nuevos exámenes

Si deseas contribuir agregando nuevos exámenes al banco de preguntas, este proyecto cuenta con un proceso semi-automatizado preparado para extraer texto y marcar las opciones correctas utilizando Inteligencia Artificial.

1. **Guarda el PDF original:** Coloca tu nuevo archivo PDF en la carpeta `fuentes/pdf/`.
2. **Utiliza la IA:** Lee y copia el texto del archivo `docs/AI_PROMPT_PROCESS_PDFS.md`. Pégalo en tu asistente de Inteligencia Artificial (ChatGPT, Claude, Gemini, etc.).
3. **Ejecuta el pipeline:** La IA te guiará para extraer el texto con IBM Docling, cruzar las coordenadas de los resaltados con Python (usando la librería PyMuPDF) y compilar todo en `src/data/questions.json` usando el script de conversión interno.

## Organización del proyecto

```text
.
├── .github/workflows/deploy.yml
├── conversion-excluded-blocks.md
├── astro.config.mjs
├── package.json
├── docs/
│   └── AI_PROMPT_PROCESS_PDFS.md
├── fuentes/
│   └── pdf/
├── public/
│   └── favicon.svg
├── scripts/
│   ├── convert-questions.mjs
│   ├── conversion-utils.mjs
│   └── validate-questions.mjs
└── src/
    ├── data/questions.json
    ├── pages/index.astro
    └── styles/global.css
```

## Publicación

El sitio está configurado para publicarse en GitHub Pages desde GitHub Actions al hacer push a `main`.

Configuración relevante:

- `astro.config.mjs` usa `base: "/residencia-quiz"` para servir assets bajo el nombre del repositorio.
- `.github/workflows/deploy.yml` instala dependencias, valida el JSON, compila Astro y publica `dist`.
- El origen de Pages debe quedar en GitHub Actions. Si la API de GitHub no permite activarlo automáticamente, configurarlo en `Settings > Pages > Source > GitHub Actions`.

URL publicada:

```text
https://luciob16.github.io/residencia-quiz/
```

## Privacidad

La aplicación no envía datos a servidores ni guarda información en la nube. El historial se escribe exclusivamente en `localStorage` del navegador y solo cuando se completa todo el cuestionario.

Cada registro local contiene:

- fecha y hora de finalización
- correctas
- incorrectas
- porcentaje
- tiempo total
- modo usado

No se guardan respuestas individuales.

## Licencia

No se declara una licencia de uso explícita para el contenido educativo incluido. El código de la mini web puede reutilizarse dentro de este repositorio.
