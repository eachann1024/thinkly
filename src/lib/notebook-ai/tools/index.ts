import { listNotebooks, listPages, listFolder, searchNotes, readPage } from "./notes";
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
  listFolder,
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

export { ALWAYS_ON_CARD_TOOLS } from "../toolAccess";

export type NotebookAiTools = typeof notebookAiTools;

export { loadSkill };
export { searchWeb, readWebPage };
export { getWeather, getExchangeRate, getWorldTime, getCryptoPrice };
export { listNotebooks, listPages, listFolder, searchNotes, readPage };
export { executeBatchPlan };
export { showTable, showChart, showDiagram, showSvg };
