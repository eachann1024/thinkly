/** 卡片类工具始终可用（不需要先加载 Skill），模型可以随时主动用卡片回答。 */
export const ALWAYS_ON_CARD_TOOLS = [
  "getWeather", "getExchangeRate", "getWorldTime", "getCryptoPrice",
  "showChoices", "showChecklist", "showSteps", "showQuiz", "showFlashcards", "showCalculator",
  "showUnitConverter", "showTimer", "showCountdown", "showTimeline", "showComparison",
  "showStats", "showRecipe", "showDefinition", "showWidget",
] as const;


/** Search answers have no write capability, including historical skill restoration. */
export const READ_ONLY_TOOL_NAMES = ["searchNotes", "readPage", "listPages", "listFolder", "searchWeb", "readWebPage", ...ALWAYS_ON_CARD_TOOLS] as const;
