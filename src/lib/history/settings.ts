import type { Page } from "@/types";
import type { NoteSettings } from "@/lib/note-metadata/contract";
import { validateSettings } from "@/lib/note-metadata/validate";
import { parseLocalFrontmatterBlob } from "@/lib/local-frontmatter";

export function getPageHistorySettings(page: Pick<Page, "fontFamily" | "pageLayout" | "isLocked" | "isPinned" | "isFavorite">): NoteSettings {
  return {
    fontFamily: page.fontFamily ?? "default", pageLayout: page.pageLayout,
    isLocked: Boolean(page.isLocked), isPinned: Boolean(page.isPinned), isFavorite: Boolean(page.isFavorite),
  };
}

export function getHistorySettings(settings: unknown, localFrontmatter?: string): NoteSettings {
  if (settings !== undefined) {
    validateSettings(settings);
    return structuredClone(settings);
  }
  const legacy = parseLocalFrontmatterBlob(localFrontmatter);
  if (!legacy.ok) throw new Error("Historical note settings are damaged");
  return legacy.settings;
}
