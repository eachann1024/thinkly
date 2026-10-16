export type EditorGridMode = "off" | "grid" | "dots";

export const EDITOR_GRID_MODES: readonly EditorGridMode[] = ["off", "grid", "dots"];

export function normalizeEditorGridMode(value: unknown): EditorGridMode {
  return EDITOR_GRID_MODES.includes(value as EditorGridMode) ? (value as EditorGridMode) : "off";
}

/** 画布网格只写根节点属性，具体绘制由主题变量完成。 */
export function applyEditorCanvasAttributes(options: {
  editorGridMode?: EditorGridMode;
  sidebarTint?: boolean;
}): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const gridMode = normalizeEditorGridMode(options.editorGridMode);
  if (gridMode === "off") root.removeAttribute("data-goose-editor-grid");
  else root.setAttribute("data-goose-editor-grid", gridMode);
  // 兼容旧设置：侧栏表面只由主题决定，不再叠加强调色。
  root.removeAttribute("data-goose-sidebar-tint");
}
