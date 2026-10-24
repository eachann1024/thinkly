export const ALWAYS_ON_CARD_TOOLS = [
  "getWeather", "getExchangeRate", "getWorldTime", "getCryptoPrice",
  "showChoices", "showChecklist", "showSteps", "showQuiz", "showFlashcards", "showCalculator",
  "showUnitConverter", "showTimer", "showCountdown", "showTimeline", "showComparison",
  "showStats", "showRecipe", "showDefinition", "showWidget",
] as const;


export const READ_ONLY_TOOL_NAMES = ["searchNotes", "readPage", "listPages", "listFolder", "searchWeb", "readWebPage", ...ALWAYS_ON_CARD_TOOLS] as const;
