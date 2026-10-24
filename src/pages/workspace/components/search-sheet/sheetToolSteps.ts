import type { NoteSource } from "./retrieveNotes";

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
const str = (value: unknown) => typeof value === "string" ? value.trim() : "";

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function toolStartSubject(name: string, args: unknown): string {
  const input = record(args);
  if (!input) return "";
  if (name === "searchNotes" || name === "searchWeb") return str(input.query);
  if (name === "readWebPage") return str(input.url) ? hostOf(str(input.url)) : "";
  if (name === "readPage") return str(input.title);
  if (name === "getWeather") return str(input.location);
  if (name === "getExchangeRate") return [str(input.from), str(input.to)].filter(Boolean).join(" → ");
  if (name === "getWorldTime") {
    const places = Array.isArray(input.places) ? input.places : [];
    return places.map(place => typeof place === "string" ? place : str(record(place)?.label)).filter(Boolean).join("、");
  }
  return "";
}

export function toolEndInfo(name: string, result: unknown, isError: boolean): { error: boolean; count?: number; subject?: string } {
  const output = record(result);
  const error = isError || Boolean(output && "error" in output && output.error);
  if (error) return { error };
  if (Array.isArray(result) && (name === "searchNotes" || name === "listPages")) return { error, count: result.length };
  if (name === "searchWeb" && Array.isArray(output?.results)) return { error, count: output.results.length };
  if (name === "readPage") return { error, subject: str(output?.title) || undefined };
  return { error };
}

export function readPageSource(result: unknown): NoteSource | null {
  const page = result as { pageId?: unknown; title?: unknown; markdown?: unknown } | null;
  if (typeof page?.pageId !== "string" || typeof page.title !== "string") return null;
  return { id: page.pageId, title: page.title, excerpt: typeof page.markdown === "string" ? page.markdown.slice(0, 200) : "" };
}
