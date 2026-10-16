/** Body-level layers. Small z-indices inside a surface remain local to it. */
export const UI_LAYERS = {
  toolbar: 1000,
  menu: 20000,
  inlineAi: 20010,
  link: 20020,
  find: 20500,
  tooltip: 21000,
  drag: 25000,
  modal: 30000,
  busy: 50000,
  toast: 60000,
} as const;

export type OverlayKind = "toolbar" | "menu" | "tooltip" | "modal";

export function overlayLayer(kind: OverlayKind, owner = 0): number {
  const offset = kind === "modal" ? 1000 : kind === "tooltip" ? 100 : 10;
  return Math.max(UI_LAYERS[kind], owner + offset);
}

/** A body portal competes with the outermost stacking context, not an inner z-index. */
export function elementRootLayer(element: HTMLElement): number {
  let layer = 0;
  for (let node: HTMLElement | null = element; node && node !== document.documentElement; node = node.parentElement) {
    const style = getComputedStyle(node);
    const positioned = style.position !== "static";
    const parentDisplay = node.parentElement && getComputedStyle(node.parentElement).display;
    const numbered = style.zIndex !== "auto" && (positioned || /flex|grid/.test(parentDisplay || ""));
    if (numbered) layer = Number(style.zIndex) || 0;
    else if (
      style.position === "fixed" || style.position === "sticky" ||
      style.transform !== "none" || style.filter !== "none" ||
      (style.backdropFilter && style.backdropFilter !== "none") || Number(style.opacity) < 1 ||
      style.isolation === "isolate" || /paint|layout|strict|content/.test(style.contain) ||
      /transform|opacity|filter/.test(style.willChange)
    ) layer = 0;
  }
  return layer;
}
