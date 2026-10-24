export type EditorGridMode = "off" | "grid" | "dots";

export const EDITOR_GRID_MODES: readonly EditorGridMode[] = ["off", "grid", "dots"];

export function normalizeEditorGridMode(value: unknown): EditorGridMode {
  return EDITOR_GRID_MODES.includes(value as EditorGridMode) ? (value as EditorGridMode) : "off";
}

export function applyEditorCanvasAttributes(options: {
  editorGridMode?: EditorGridMode;
}): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const gridMode = normalizeEditorGridMode(options.editorGridMode);
  if (gridMode === "off") root.removeAttribute("data-goose-editor-grid");
  else root.setAttribute("data-goose-editor-grid", gridMode);
}
