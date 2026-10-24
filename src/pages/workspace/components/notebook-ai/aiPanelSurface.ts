
export const AI_PANEL_ACTIVE_ATTR = "data-goose-ai-panel-active";
export const AI_FULLSCREEN_ATTR = "data-goose-ai-fullscreen";

export const FLOATING_LAYER_SELECTORS = [
  "[data-formatting-toolbar]",
  "[data-goose-formatting-toolbar-dock]",
  "[data-goose-image-toolbar]",
  "[data-goose-video-toolbar]",
  "[data-goose-find-in-page]",
  ".goose-code-floating-toolbar",
  ".goose-ai-menu-floating",
  ".bn-side-menu",
  ".bn-link-toolbar",
  "[data-goose-link-toolbar]",
  ".bn-panel",
  ".bn-suggestion-menu",
  ".bn-grid-suggestion-menu",
  ".bn-table-handle",
  ".bn-table-cell-handle",
  ".bn-table-handle-menu",
  '[data-streamdown="code-block-actions"]',
  '[data-streamdown="mermaid-block-actions"]',
  '[data-streamdown="table-fullscreen"]',
  '[data-streamdown="link-safety-modal"]',
] as const;

export function setAiPanelSurface(options: {
  active: boolean;
  fullscreen: boolean;
}): void {
  const { body } = document;
  body.toggleAttribute(AI_PANEL_ACTIVE_ATTR, options.active);
  body.toggleAttribute(AI_FULLSCREEN_ATTR, options.active && options.fullscreen);
}

export function clearAiPanelSurface(): void {
  document.body.removeAttribute(AI_PANEL_ACTIVE_ATTR);
  document.body.removeAttribute(AI_FULLSCREEN_ATTR);
}

export function dismissAiFloatingLayers(root?: Node | null): void {
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const anchor = selection.anchorNode;
    if (!root || (anchor && root.contains(anchor))) {
      selection.removeAllRanges();
    }
  }

  for (const node of document.querySelectorAll<HTMLElement>(
    '[data-streamdown="table-fullscreen"] button[title], [data-streamdown="link-safety-modal"] button[title]',
  )) {
    node.click();
  }
}
