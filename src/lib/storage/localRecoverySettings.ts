import type { Page } from "@/types";
import type { NoteSettings } from "@/lib/note-metadata/contract";
import { validateSettings } from "@/lib/note-metadata/validate";

export function recoverySettings(page: Partial<Page>): NoteSettings {
  return {
    fontFamily: page.fontFamily ?? "default", pageLayout: page.pageLayout,
    isLocked: Boolean(page.isLocked), isPinned: Boolean(page.isPinned), isFavorite: Boolean(page.isFavorite),
  };
}

export function recoverySettingsMatch(page: Partial<Page>, expected?: NoteSettings): boolean {
  if (!expected) return true;
  try { validateSettings(expected); } catch { return false; }
  const current = recoverySettings(page);
  return Object.keys(current).every((key) => current[key as keyof NoteSettings] === expected[key as keyof NoteSettings]);
}

export function validRecoverySettings(value: unknown): boolean {
  if (value === undefined) return true;
  try { validateSettings(value); return true; } catch { return false; }
}
