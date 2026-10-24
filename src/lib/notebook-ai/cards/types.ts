
export type WeatherDay = {
  date: string;
  weatherCode: number;
  max: number;
  min: number;
  precipitationProbability: number | null;
};

export type WeatherCardData = {
  kind: "weather";
  location: { name: string; region?: string; country?: string; timezone: string };
  current: {
    temperature: number;
    apparentTemperature: number;
    humidity: number;
    windSpeed: number;
    weatherCode: number;
    isDay: boolean;
  };
  daily: WeatherDay[];
  units: { temperature: string; windSpeed: string };
  source: string;
  fetchedAt: string;
};

export type ExchangeCardData = {
  kind: "exchange";
  base: string;
  quote: string;
  amount: number;
  rate: number;
  converted: number;
  date: string;
  history: Array<{ date: string; rate: number }>;
  source: string;
};

export type WorldTimeCardData = {
  kind: "worldTime";
  entries: Array<{ label: string; timeZone: string }>;
};

export type WebResultsCardData = {
  kind: "webResults";
  query: string;
  results: Array<{ title: string; url: string; snippet: string }>;
  source: string;
};

import { DISPLAY_CARD_KINDS, type DisplayCardData } from "./displayTypes";
export type * from "./displayTypes";

export type InfoCardData = WeatherCardData | ExchangeCardData | WorldTimeCardData | WebResultsCardData | DisplayCardData;


export { ALWAYS_ON_CARD_TOOLS as CARD_TOOL_NAMES } from "../tools";

export function toInfoCard(toolName: string, output: unknown): InfoCardData | null {
  if (!output || typeof output !== "object") return null;
  const record = output as Record<string, unknown>;
  if ("error" in record && record.error) return null;
  if (toolName === "searchWeb") {
    const results = Array.isArray(record.results) ? (record.results as WebResultsCardData["results"]) : [];
    if (results.length === 0) return null;
    return { kind: "webResults", query: String(record.query ?? ""), results, source: String(record.source ?? "") };
  }
  const kind = record.kind;
  if (kind === "weather" || kind === "exchange" || kind === "worldTime" || (typeof kind === "string" && DISPLAY_CARD_KINDS.has(kind))) return output as InfoCardData;
  return null;
}
