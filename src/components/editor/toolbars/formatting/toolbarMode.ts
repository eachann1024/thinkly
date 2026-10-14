export const FORMATTING_TOOLBAR_MODES = [
  "top-bar",
  "floating",
  "top-minimal",
] as const;

export type FormattingToolbarMode = (typeof FORMATTING_TOOLBAR_MODES)[number];

export type FixedFormattingToolbarVariant = Exclude<
  FormattingToolbarMode,
  "floating"
>;

export const DEFAULT_FORMATTING_TOOLBAR_MODE: FormattingToolbarMode =
  "top-bar";

export function normalizeFormattingToolbarMode(
  value: unknown,
): FormattingToolbarMode {
  if (value === "top-capsule") return DEFAULT_FORMATTING_TOOLBAR_MODE;
  return FORMATTING_TOOLBAR_MODES.includes(value as FormattingToolbarMode)
    ? (value as FormattingToolbarMode)
    : DEFAULT_FORMATTING_TOOLBAR_MODE;
}

export function isFixedFormattingToolbarMode(
  mode: FormattingToolbarMode,
): mode is FixedFormattingToolbarVariant {
  return mode !== "floating";
}

/** 宿主窗格根节点与其顶部插槽的标记；固定工具栏据此就近挂载。 */
export const FIXED_TOOLBAR_PANE_ATTR = "data-goose-editor-pane";
export const FIXED_TOOLBAR_SLOT_ATTR = "data-goose-fixed-toolbar-slot";
