import { writeConversion } from "./conversion-utils.mjs";

const result = writeConversion(process.cwd());

console.log(JSON.stringify({
  detectedQuestions: result.totalBlocks,
  convertedQuestions: result.questions.length,
  excludedBlocks: result.excluded.length,
  questionsPath: result.questionsPath,
  excludedPath: result.excludedPath,
}, null, 2));
