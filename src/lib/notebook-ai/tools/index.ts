import { listNotebooks, listPages, searchNotes, readPage } from "./notes";
import { showTable, showChart, showDiagram, showSvg } from "./visual";
import { loadSkill } from "./skills";
import { readWebPage, searchWeb } from "./web";
import { getWeather, getExchangeRate, getWorldTime, getCryptoPrice } from "./cards";
import { showChoices, showChecklist, showSteps, showQuiz, showFlashcards, showCalculator, showUnitConverter, showTimer, showCountdown } from "./interactiveCards";
import { showTimeline, showComparison, showStats, showRecipe, showDefinition, showWidget } from "./infoCards";
import { executeBatchPlan } from "../batch-plan";

export const notebookAiTools = {
  loadSkill,
  searchWeb,
  readWebPage,
  getWeather,
  getExchangeRate,
  getWorldTime,
  getCryptoPrice,
  listNotebooks,
  listPages,
  searchNotes,
  readPage,
  executeBatchPlan,
  showTable,
  showChart,
  showDiagram,
  showSvg,
  showChoices,
  showChecklist,
  showSteps,
  showQuiz,
  showFlashcards,
  showCalculator,
  showUnitConverter,
  showTimer,
  showCountdown,
  showTimeline,
  showComparison,
  showStats,
  showRecipe,
  showDefinition,
  showWidget,
} as const;

/** 卡片类工具始终可用（不需要先加载 Skill），模型可以随时主动用卡片回答。 */
export const ALWAYS_ON_CARD_TOOLS = [
  "getWeather", "getExchangeRate", "getWorldTime", "getCryptoPrice",
  "showChoices", "showChecklist", "showSteps", "showQuiz", "showFlashcards", "showCalculator",
  "showUnitConverter", "showTimer", "showCountdown", "showTimeline", "showComparison",
  "showStats", "showRecipe", "showDefinition", "showWidget",
] as const satisfies ReadonlyArray<keyof typeof notebookAiTools>;

export type NotebookAiTools = typeof notebookAiTools;

export { loadSkill };
export { searchWeb, readWebPage };
export { getWeather, getExchangeRate, getWorldTime, getCryptoPrice };
export { listNotebooks, listPages, searchNotes, readPage };
export { executeBatchPlan };
export { showTable, showChart, showDiagram, showSvg };
