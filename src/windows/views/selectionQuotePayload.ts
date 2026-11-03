import { readNoteLocation, type NoteBlockLocation } from "@/lib/notebook-ai/noteCitationLocation";

export type SelectionQuotePayload = {
  pageId: string;
  pageTitle: string;
  text: string;
  sourceAvailable: boolean;
  location?: NoteBlockLocation;
};

export function readSelectionQuotePayload(value: unknown): SelectionQuotePayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.pageId !== "string" || typeof raw.text !== "string") return null;
  const location = raw.location === undefined ? undefined : readNoteLocation(raw.location);
  return {
    pageId: raw.pageId,
    pageTitle: typeof raw.pageTitle === "string" ? raw.pageTitle : "",
    text: raw.text,
    sourceAvailable: raw.sourceAvailable === true,
    ...(location ? { location } : {}),
  };
}
