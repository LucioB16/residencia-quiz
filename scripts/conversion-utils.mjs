import fs from "node:fs";
import path from "node:path";

export const SOURCE_DIR = "c:\\Users\\lucio\\repos\\RESIDENCIAS\\ai_ready_documents\\Córdoba_";
export const QUESTIONS_JSON = path.join("src", "data", "questions.json");
export const EXCLUDED_BLOCKS_MD = "conversion-excluded-blocks.md";

const questionStartPattern = /^\s*(?:-\s*)?(\d{1,3})[.)]\s*(.*)$/;
const optionStartPattern = /^\s*(?:-\s*)?(?:\d+\.\s*)?(##\s+)?([a-eA-E])[.-]\s*(.*)$/;

export function looksLikeQuestionStart(line, previousNumber) {
  const match = line.match(questionStartPattern);
  if (!match) return false;

  const number = Number(match[1]);
  const text = match[2] ?? "";

  // Consider it a question start if it's the next sequential number, or if it's 1.
  // Or if it starts with an uppercase letter, or if the text is empty (sometimes just the number)
  // Check if it's an option that happens to start with a number like "2. A-"
  if (/^[A-Ea-e][.-]/.test(text)) {
      return false;
  }

  if (previousNumber !== null && (number === previousNumber + 1 || number === 1)) {
    return true;
  }
  
  if (text === "" || /[A-ZÁÉÍÓÚÑÜ¿?]/.test(text[0] ?? "")) {
      return true;
  }

  return false;
}

export function detectQuestionBlocks(lines) {
  const starts = [];
  let previousNumber = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!looksLikeQuestionStart(line, previousNumber)) continue;

    const match = line.match(questionStartPattern);
    const number = Number(match[1]);
    starts.push({
      lineIndex: index,
      lineNumber: index + 1,
      number,
      rawStartLine: line,
    });
    previousNumber = number;
  }

  return starts.map((start, index) => ({
    ...start,
    endLineIndex: index + 1 < starts.length ? starts[index + 1].lineIndex : lines.length,
  }));
}

function trimEmptyEdges(lines) {
  let start = 0;
  let end = lines.length;

  while (start < end && lines[start].trim() === "") start += 1;
  while (end > start && lines[end - 1].trim() === "") end -= 1;

  return lines.slice(start, end);
}

function normalizeText(lines) {
  return trimEmptyEdges(lines.map((line) => line.replace(/[ \t]+$/u, ""))).join("\n");
}

function removeQuestionPrefix(line) {
  return line.replace(questionStartPattern, "$2");
}

function optionLineIndexes(blockLines) {
  const indexes = [];
  let expectedCode = "a".charCodeAt(0);

  for (let index = 0; index < blockLines.length; index += 1) {
    const match = blockLines[index].match(optionStartPattern);
    if (!match) continue;

    const optionCode = match[2].toLowerCase().charCodeAt(0);
    // Be a bit lenient, sometimes they skip letters or start with A again
    if (optionCode >= "a".charCodeAt(0) && optionCode <= "e".charCodeAt(0)) {
      indexes.push(index);
    }
  }

  return indexes;
}

function findLastOptionEnd(blockLines, lastOptionStartIndex) {
  for (let index = lastOptionStartIndex + 1; index < blockLines.length; index += 1) {
    const line = blockLines[index];

    if (/^\s*\*/.test(line) || /^\s*_+/.test(line)) return index;

    if (line.trim() === "") {
      let next = index + 1;
      while (next < blockLines.length && blockLines[next].trim() === "") next += 1;
      if (next >= blockLines.length || !optionStartPattern.test(blockLines[next])) {
        return index;
      }
    }
  }

  return blockLines.length;
}

function parseOptions(blockLines) {
  const indexes = optionLineIndexes(blockLines);
  if (indexes.length === 0) return [];

  const lastOptionEnd = findLastOptionEnd(blockLines, indexes[indexes.length - 1]);

  return indexes.map((startIndex, index) => {
    const nextOptionIndex = index + 1 < indexes.length ? indexes[index + 1] : lastOptionEnd;
    const firstLine = blockLines[startIndex];
    const match = firstLine.match(optionStartPattern);
    const isCorrect = !!match[1]; // match[1] is the `## ` capture group
    
    const rawOptionLines = [
      match[3], // The rest of the line after option letter
      ...blockLines.slice(startIndex + 1, nextOptionIndex),
    ];

    const rawText = rawOptionLines.join("\n");

    return {
      id: match[2].toLowerCase(),
      text: normalizeText(rawOptionLines),
      isCorrect,
      startLineOffset: startIndex,
    };
  });
}

function issueSummary(issues) {
  return [...new Set(issues)];
}

export function analyzeBlock(lines, block, fileBaseName) {
  const blockLines = lines.slice(block.lineIndex, block.endLineIndex);
  
  // Clean up trailing separators like \_\_\_\_
  let endIdx = blockLines.length;
  while (endIdx > 0 && /^\s*[_]{2,}/.test(blockLines[endIdx - 1])) {
    endIdx--;
  }
  const cleanBlockLines = blockLines.slice(0, endIdx);

  const optionIndexes = optionLineIndexes(cleanBlockLines);
  const firstOptionIndex = optionIndexes[0] ?? -1;
  const issues = [];
  const options = parseOptions(cleanBlockLines);

  if (firstOptionIndex === -1) {
    issues.push("no_options");
  }

  let correctCount = 0;
  if (options.length > 0) {
    correctCount = options.filter((option) => option.isCorrect).length;
    if (correctCount !== 1) issues.push(`correct_count_${correctCount}`);
    if (options.length < 2) issues.push(`option_count_${options.length}`);

    const duplicateIds = new Set();
    const seenIds = new Set();
    for (const option of options) {
      if (seenIds.has(option.id)) duplicateIds.add(option.id);
      seenIds.add(option.id);
    }
    if (duplicateIds.size > 0) issues.push(`duplicate_option_ids_${[...duplicateIds].join("_")}`);
  }

  const statementLines = firstOptionIndex === -1
    ? cleanBlockLines
    : cleanBlockLines.slice(0, firstOptionIndex);
  if (statementLines.length > 0) {
    statementLines[0] = removeQuestionPrefix(statementLines[0]);
  }

  return {
    file: fileBaseName,
    sourceNumber: block.number,
    lineNumber: block.lineNumber,
    firstLine: cleanBlockLines[0] ?? "",
    rawBlock: normalizeText(cleanBlockLines),
    statement: normalizeText(statementLines),
    options,
    markerCount: correctCount,
    issues: issueSummary(issues),
  };
}

function questionId(order) {
  return `q${String(order).padStart(4, "0")}`;
}

function escapeTableCell(value) {
  return String(value)
    .replace(/\r?\n/g, " ")
    .replace(/\|/g, "\\|")
    .trim();
}

function renderExcludedMarkdown(problemBlocks, totalBlocks) {
  const issueCounts = problemBlocks.reduce((accumulator, block) => {
    for (const issue of block.issues) {
      accumulator[issue] = (accumulator[issue] ?? 0) + 1;
    }
    return accumulator;
  }, {});

  const summaryRows = Object.entries(issueCounts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([issue, count]) => `- \`${issue}\`: ${count}`);

  const tableRows = problemBlocks.map((block, index) => (
    `| ${index + 1} | ${block.file} | ${block.sourceNumber} | ${block.lineNumber} | ${block.options.length} | ${block.markerCount} | ${escapeTableCell(block.issues.join(", "))} | ${escapeTableCell(block.firstLine)} |`
  ));

  const blocks = problemBlocks.map((block, index) => [
    `## Bloque excluido ${String(index + 1).padStart(3, "0")}`,
    "",
    `- Archivo: ${block.file}`,
    `- Numero fuente: ${block.sourceNumber}`,
    `- Linea inicial: ${block.lineNumber}`,
    `- Opciones detectadas: ${block.options.length}`,
    `- Marcadores \`## \`: ${block.markerCount}`,
    `- Problemas: ${block.issues.map((issue) => "\`" + issue + "\`").join(", ")}`,
    "",
    "~~~markdown",
    block.rawBlock,
    "~~~",
    "",
  ].join("\n"));

  return [
    "# Bloques Excluidos De La Conversion",
    "",
    "Estos bloques fueron excluidos de `src/data/questions.json` porque no tienen exactamente una opcion correcta o son ambiguos.",
    "",
    "## Resumen",
    "",
    `- Preguntas detectadas en total: ${totalBlocks}`,
    `- Bloques excluidos: ${problemBlocks.length}`,
    "",
    "## Conteo Por Tipo De Problema",
    "",
    ...summaryRows,
    "",
    "## Indice",
    "",
    "| # | Archivo | Num | Linea | Opciones | Correctas | Problemas | Primera linea |",
    "| ---: | --- | ---: | ---: | ---: | ---: | --- | --- |",
    ...tableRows,
    "",
    ...blocks,
  ].join("\n");
}

export function parseMarkdownFiles() {
  const files = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith(".md"));
  
  const allValid = [];
  const allExcluded = [];
  let totalBlocks = 0;

  for (const file of files) {
    const filePath = path.join(SOURCE_DIR, file);
    const markdown = fs.readFileSync(filePath, "utf8");
    const lines = markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    
    const blocks = detectQuestionBlocks(lines);
    totalBlocks += blocks.length;
    
    const analyzed = blocks.map((block) => analyzeBlock(lines, block, file));
    
    const excluded = analyzed.filter((block) => block.issues.length > 0);
    const valid = analyzed.filter((block) => block.issues.length === 0);
    
    allExcluded.push(...excluded);
    allValid.push(...valid);
  }

  const questions = allValid.map((block, index) => ({
    id: questionId(index + 1),
    order: index + 1,
    statement: block.statement,
    options: block.options.map((option) => ({
      id: option.id,
      text: option.text,
      isCorrect: option.isCorrect,
    })),
  }));

  return {
    totalBlocks,
    valid: allValid,
    excluded: allExcluded,
    questions,
    excludedMarkdown: renderExcludedMarkdown(allExcluded, totalBlocks),
  };
}

export function writeConversion(root = process.cwd()) {
  const parsed = parseMarkdownFiles();
  const questionsPath = path.join(root, QUESTIONS_JSON);
  const excludedPath = path.join(root, EXCLUDED_BLOCKS_MD);

  fs.mkdirSync(path.dirname(questionsPath), { recursive: true });
  fs.writeFileSync(questionsPath, JSON.stringify(parsed.questions, null, 2) + "\n", "utf8");
  fs.writeFileSync(excludedPath, parsed.excludedMarkdown, "utf8");

  return {
    ...parsed,
    questionsPath,
    excludedPath,
  };
}
