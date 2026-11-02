import type { RefObject } from "react";
import type { normalizeAppShortcuts } from "@/stores/settings/slices/shortcutsSlice";

export type HotkeyEntry = {
  id: string;
  shortcutId?: string;
  match: (event: KeyboardEvent) => boolean;
  when?: (event: KeyboardEvent) => boolean;
  handler: (event: KeyboardEvent) => void;
  allowRepeat?: boolean;
};

export type AppHotkeyRefs = {
  appShortcutsRef: RefObject<ReturnType<typeof normalizeAppShortcuts>>;
};
