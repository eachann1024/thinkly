import type { Page } from "@/types";
import { countWordsInText, extractTextFromContent } from "@/components/editor/utils/content-text-extractor";
import { isSidecarOnlyBlockChange } from "@/lib/note-metadata/settingsSave";
import { dayKey } from "./weekRange";

const PREFIX = "thinkly:edit-activity:v1:";
// Separate writer keys prevent two windows from overwriting each other's edits.
const writer = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const RETENTION_MS = 120 * 86_400_000;
let lastPrunedDay = "";

interface Session {
  at: number;
  lastAt: number;
  delta: number;
  lastSignature: string;
}
interface Bucket {
  pageId: string;
  sessions: Session[];
}
export interface EditEvent { pageId: string; at: number; added: number }

export function isEditablePage(page: Page): boolean {
  return !page.isFolder && !page.trashedAt && !page.editorDraft &&
    page.localReadState !== "error" && page.id !== "__quicknote_draft__";
}

function signature(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return `${text.length}:${hash >>> 0}`;
}

function decode(raw: string | null): Bucket | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Bucket;
    if (!value || typeof value.pageId !== "string" || !Array.isArray(value.sessions)) return null;
    return { pageId: value.pageId, sessions: value.sessions.filter((s) => s &&
      Number.isFinite(s.at) && s.at > 0 && Number.isFinite(s.lastAt) && s.lastAt >= s.at &&
      Number.isFinite(s.delta) && typeof s.lastSignature === "string") };
  } catch { return null; }
}

function keys(storage: Storage): string[] {
  return Array.from({ length: storage.length }, (_, i) => storage.key(i))
    .filter((key): key is string => Boolean(key?.startsWith(PREFIX)));
}

function prune(storage: Storage, now: number) {
  const today = dayKey(now);
  if (lastPrunedDay === today) return;
  for (const key of keys(storage)) {
    const bucket = decode(storage.getItem(key));
    if (!bucket || bucket.sessions.every((s) => s.lastAt < now - RETENTION_MS)) storage.removeItem(key);
  }
  lastPrunedDay = today;
}

/** Only call for authored body changes; imports, reloads and restores are baselines. */
export function recordPageActivity(before: Page, after: Page, activityId?: string): void {
  if (typeof window === "undefined" || before.id !== after.id ||
    after.isFolder || after.trashedAt || after.localReadState === "error" ||
    after.id === "__quicknote_draft__") return;
  try {
    if (isSidecarOnlyBlockChange(before.content, after.content)) return;
    const beforeText = extractTextFromContent(before.content);
    const afterText = extractTextFromContent(after.content);
    if (beforeText === afterText) return;
    const now = Date.now();
    const storage = window.localStorage;
    prune(storage, now);
    const key = activityId ? `${PREFIX}operation:${encodeURIComponent(activityId)}`
      : `${PREFIX}${dayKey(now)}:${encodeURIComponent(after.id)}:${writer}`;
    const bucket = (!activityId && decode(storage.getItem(key))) || { pageId: after.id, sessions: [] };
    const previous = bucket.sessions.at(-1);
    const delta = countWordsInText(afterText) - countWordsInText(beforeText);
    // Net changes within an editing burst avoid inflating immediate undo/redo.
    if (previous && now >= previous.lastAt && now - previous.lastAt < 15_000 &&
      now - previous.at < 300_000 && new Date(now).getHours() === new Date(previous.at).getHours() &&
      previous.lastSignature === signature(beforeText)) {
      previous.delta += delta;
      previous.lastAt = now;
      previous.lastSignature = signature(afterText);
    } else {
      bucket.sessions.push({ at: now, lastAt: now, delta, lastSignature: signature(afterText) });
    }
    storage.setItem(key, JSON.stringify(bucket));
  } catch (error) {
    console.error("[reflection] Could not persist edit activity", error);
  }
}

export function readPageActivity(since: number, pages: Record<string, Page>): EditEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const storage = window.localStorage;
    const now = Date.now();
    return keys(storage).flatMap((key) => {
      const bucket = decode(storage.getItem(key));
      const page = bucket && pages[bucket.pageId];
      if (!bucket || !page || !isEditablePage(page)) return [];
      return bucket.sessions.filter((s) => s.at >= since && s.at <= now)
        .map((s) => ({ pageId: bucket.pageId, at: s.at, added: Math.max(0, s.delta) }));
    }).sort((a, b) => a.at - b.at || a.pageId.localeCompare(b.pageId));
  } catch (error) {
    console.error("[reflection] Could not read edit activity", error);
    return [];
  }
}

/** Compensation removes only the successful AI operation, preserving concurrent user edits. */
export function removePageActivity(activityId: string): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(`${PREFIX}operation:${encodeURIComponent(activityId)}`); }
  catch (error) { console.error("[reflection] Could not remove compensated activity", error); }
}
