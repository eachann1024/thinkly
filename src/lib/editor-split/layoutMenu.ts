export const SPLIT_LAYOUT_MENU_EVENT = "goose-note:split-layout";

export const SPLIT_LAYOUT_MENU_ACTIONS = ["columns", "rows", "grid", "equalize"] as const;

export type SplitLayoutMenuAction = (typeof SPLIT_LAYOUT_MENU_ACTIONS)[number];

export function isSplitLayoutMenuAction(value: unknown): value is SplitLayoutMenuAction {
  return typeof value === "string" && (SPLIT_LAYOUT_MENU_ACTIONS as readonly string[]).includes(value);
}
