
export type ChoicesCardData = { kind: "choices"; question?: string; options: Array<{ label: string; message?: string; description?: string }> };
export type ChecklistCardData = { kind: "checklist"; title: string; items: Array<{ text: string; done?: boolean }> };
export type StepsCardData = { kind: "steps"; title: string; steps: Array<{ title: string; detail?: string }> };
export type QuizCardData = {
  kind: "quiz";
  title: string;
  questions: Array<{ question: string; options: string[]; answer: number; explanation?: string }>;
};
export type FlashcardsCardData = { kind: "flashcards"; title: string; cards: Array<{ front: string; back: string }> };
export type CalculatorCardData = {
  kind: "calculator";
  title: string;
  variables: Array<{ name: string; label: string; value: number; min: number; max: number; step?: number; unit?: string }>;
  outputs: Array<{ label: string; formula: string; unit?: string; decimals?: number }>;
};
export type UnitConverterCardData = {
  kind: "unitConverter";
  category: "length" | "weight" | "temperature" | "area" | "volume" | "speed" | "data" | "time";
  value: number;
  from: string;
  to: string;
};
export type TimerCardData = { kind: "timer"; title: string; minutes: number };
export type CountdownCardData = { kind: "countdown"; title: string; target: string };
export type TimelineCardData = { kind: "timeline"; title: string; events: Array<{ time: string; title: string; detail?: string }> };
export type ComparisonCardData = {
  kind: "comparison";
  title: string;
  columns: string[];
  rows: Array<{ label: string; values: string[] }>;
  recommended?: number;
  verdict?: string;
};
export type StatsCardData = {
  kind: "stats";
  title?: string;
  stats: Array<{ label: string; value: string; delta?: string; trend?: "up" | "down" | "flat" }>;
};
export type RecipeCardData = {
  kind: "recipe";
  title: string;
  servings: number;
  time?: string;
  ingredients: Array<{ name: string; amount?: number; unit?: string }>;
  steps: string[];
};
export type DefinitionCardData = {
  kind: "definition";
  term: string;
  phonetic?: string;
  partOfSpeech?: string;
  definitions: string[];
  examples?: string[];
};
export type WidgetCardData = { kind: "widget"; title: string; html: string; height?: number };
export type CryptoCardData = {
  kind: "crypto";
  currency: string;
  coins: Array<{ id: string; price: number; change24h: number }>;
  source: string;
  fetchedAt: string;
};

export type DisplayCardData =
  | ChoicesCardData | ChecklistCardData | StepsCardData | QuizCardData | FlashcardsCardData
  | CalculatorCardData | UnitConverterCardData | TimerCardData | CountdownCardData | TimelineCardData
  | ComparisonCardData | StatsCardData | RecipeCardData | DefinitionCardData | WidgetCardData | CryptoCardData;

export const DISPLAY_CARD_KINDS = new Set<string>([
  "choices", "checklist", "steps", "quiz", "flashcards", "calculator", "unitConverter", "timer", "countdown",
  "timeline", "comparison", "stats", "recipe", "definition", "widget", "crypto",
]);
