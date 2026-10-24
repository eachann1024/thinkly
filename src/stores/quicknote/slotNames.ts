import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/stores/quicknote/slotNames.ts#localMessages:1">`
zh-Hans:
  defaultName: "速记 {{slot}}"
en:
  defaultName: "Quick Note {{slot}}"
ja:
  defaultName: "クイックノート {{slot}}"
`;
const uiText = createTranslator(localMessages);
import type { QuickNoteSlotNames, QuickNoteSlot } from "./types";
import {
  normalizeSlot,
  normalizeSlotName,
  normalizeSlotNames,
} from "./normalization";
import { getDbStorageItem, setDbStorageItem } from "@/lib/storage";

export const QUICKNOTE_SLOT_NAMES_STORAGE_KEY =
  "thinkly:quicknote-slot-names";

export interface PersistedQuickNoteSlotNames {
  version: 1;
  slotNames: QuickNoteSlotNames;
}

export function updateQuickNoteSlotName(
  current: QuickNoteSlotNames,
  slot: QuickNoteSlot,
  name: string,
): QuickNoteSlotNames {
  const target = normalizeSlot(slot);
  const normalizedName = normalizeSlotName(name);
  if (current[target] === normalizedName) return current;
  return { ...current, [target]: normalizedName };
}

export function parsePersistedQuickNoteSlotNames(
  raw: string | null,
  fallback: QuickNoteSlotNames,
): QuickNoteSlotNames {
  if (!raw) return normalizeSlotNames(fallback);
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedQuickNoteSlotNames>;
    return normalizeSlotNames(parsed.slotNames);
  } catch {
    return normalizeSlotNames(fallback);
  }
}

export function serializeQuickNoteSlotNames(
  slotNames: QuickNoteSlotNames,
): string {
  return JSON.stringify({
    version: 1,
    slotNames: normalizeSlotNames(slotNames),
  } satisfies PersistedQuickNoteSlotNames);
}

export function loadQuickNoteSlotNames(
  legacyNames: QuickNoteSlotNames,
): QuickNoteSlotNames {
  return parsePersistedQuickNoteSlotNames(
    getDbStorageItem(QUICKNOTE_SLOT_NAMES_STORAGE_KEY),
    legacyNames,
  );
}

export function persistQuickNoteSlotNames(slotNames: QuickNoteSlotNames): void {
  setDbStorageItem(
    QUICKNOTE_SLOT_NAMES_STORAGE_KEY,
    serializeQuickNoteSlotNames(slotNames),
  );
}

export function getQuickNoteSlotName(
  slot: QuickNoteSlot,
  names: QuickNoteSlotNames,
): string {
  return normalizeSlotName(names[slot]) || uiText("defaultName", {slot});
}
