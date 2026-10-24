export type TabRailLayoutMode = "fill" | "split" | "scroll";

export const TAB_RAIL_TITLE_FIELD_SELECTOR =
  "button, a, input, textarea, [data-page-title-field]";

function asClosestHost(
  target: EventTarget | null,
): Pick<Element, "closest"> | null {
  if (typeof target !== "object" || target === null) return null;
  if ("closest" in target && typeof target.closest === "function") {
    return target as Pick<Element, "closest">;
  }
  return null;
}

export function isTabRailTitleFieldTarget(target: EventTarget | null): boolean {
  return Boolean(
    asClosestHost(target)?.closest(TAB_RAIL_TITLE_FIELD_SELECTOR),
  );
}

export function shouldHandleTabActivationKey(
  key: string,
  target: EventTarget | null,
): boolean {
  if (key !== "Enter" && key !== " ") return false;
  return !isTabRailTitleFieldTarget(target);
}

export const TAB_RAIL_SCROLL_MIN_COUNT = 4;

export function getTabRailLayoutMode(tabCount: number): TabRailLayoutMode {
  if (tabCount <= 1) return "fill";
  if (tabCount < TAB_RAIL_SCROLL_MIN_COUNT) return "split";
  return "scroll";
}

export function tabRailSelectionClassName(tabCount: number, isActive: boolean): string {
  if (tabCount <= 1) return "text-foreground";
  return isActive
    ? "bg-[var(--goose-interactive-selected)] text-[var(--goose-interactive-selected-fg)]"
    : "text-muted-foreground hover:bg-[var(--goose-interactive-hover)] hover:text-[var(--goose-interactive-selected-fg)]";
}

export function tabRailListClassName(tabCount: number): string {
  const mode = getTabRailLayoutMode(tabCount);
  if (mode === "scroll") {
    return "tab-rail flex min-w-0 flex-1 items-center overflow-x-auto";
  }
  return "tab-rail flex min-w-0 flex-1 items-center";
}

export function tabRailItemClassName(tabCount: number): string {
  const mode = getTabRailLayoutMode(tabCount);
  if (mode === "fill") {
    return "tab-rail-item min-w-0 flex-1";
  }
  if (mode === "split") {
    return "tab-rail-item min-w-0 flex-[1_1_0]";
  }
  return "tab-rail-item min-w-0 flex-[0_0_155px]";
}
