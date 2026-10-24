import type { AiSkillCommandAttrs } from "./referenceTypes";

export function createSkillChipElement(
  attrs: AiSkillCommandAttrs,
): HTMLSpanElement {
  const span = document.createElement("span");
  span.contentEditable = "false";
  span.dataset.aiSkillAttrs = JSON.stringify(attrs);
  span.className =
    "ai-composer-chip inline-flex items-center justify-center rounded text-[11px] font-medium" +
    " bg-[var(--goose-interactive-selected)] text-[var(--goose-interactive-selected-fg)] border border-border" +
    " cursor-pointer hover:bg-[var(--goose-interactive-hover)] select-none";
  span.textContent = `/${attrs.name}`;
  return span;
}
