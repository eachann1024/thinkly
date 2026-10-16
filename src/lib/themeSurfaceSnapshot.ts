import { useSyncExternalStore } from "react";

const FALLBACK_SNAPSHOT = {
  background: "#ffffff",
  foreground: "#1f1e1d",
  secondary: "#64635e",
  border: "#d8dee4",
  hover: "#f2f3f5",
  selected: "#e8eaed",
  radius: "8px",
  gap: "4px",
  motion: "150ms",
};

type ThemeSurfaceSnapshot = typeof FALLBACK_SNAPSHOT;

/** Canvas/iframe 边界只读取已经解析的语义颜色，不另建明暗色表。 */
export function readThemeSurfaceSnapshot(root?: HTMLElement): ThemeSurfaceSnapshot {
  const element = root ?? (typeof document === "undefined" ? undefined : document.documentElement);
  if (!element) return FALLBACK_SNAPSHOT;

  const probe = element.ownerDocument.createElement("span");
  probe.style.cssText = [
    "position:absolute",
    "visibility:hidden",
    "pointer-events:none",
    "background-color:hsl(var(--goose-editor-bg))",
    "color:var(--goose-text-primary)",
    "border-top-color:var(--goose-text-secondary)",
    "border-right-color:hsl(var(--border))",
    "border-bottom-color:var(--goose-interactive-hover)",
    "outline-color:var(--goose-interactive-selected)",
  ].join(";");
  element.append(probe);

  const styles = getComputedStyle(probe);
  const value = (name: string, defaultValue: string) =>
    styles.getPropertyValue(name).trim() || defaultValue;
  const color = (value: string, defaultValue: string) => value || defaultValue;
  const snapshot = {
    background: color(styles.backgroundColor, FALLBACK_SNAPSHOT.background),
    foreground: color(styles.color, FALLBACK_SNAPSHOT.foreground),
    secondary: color(styles.borderTopColor, FALLBACK_SNAPSHOT.secondary),
    border: color(styles.borderRightColor, FALLBACK_SNAPSHOT.border),
    hover: color(styles.borderBottomColor, FALLBACK_SNAPSHOT.hover),
    selected: color(styles.outlineColor, FALLBACK_SNAPSHOT.selected),
    radius: value("--goose-control-radius", FALLBACK_SNAPSHOT.radius),
    gap: value("--goose-menu-row-gap", FALLBACK_SNAPSHOT.gap),
    motion: value("--goose-control-motion-duration", FALLBACK_SNAPSHOT.motion),
  };
  probe.remove();
  return snapshot;
}

const listeners = new Set<() => void>();
let snapshot: ThemeSurfaceSnapshot | undefined;
let observedAttributes = "";
let observer: MutationObserver | undefined;
let frame = 0;
let notificationPending = false;

function readObservedAttributes(): string {
  const root = typeof document === "undefined" ? undefined : document.documentElement;
  return root
    ? `${root.getAttribute("class") ?? ""}\u0000${root.getAttribute("style") ?? ""}\u0000${root.getAttribute("data-theme") ?? ""}`
    : "";
}

function readSharedSnapshot(): ThemeSurfaceSnapshot {
  const attributes = readObservedAttributes();
  if (!snapshot || attributes !== observedAttributes) {
    snapshot = readThemeSurfaceSnapshot();
    observedAttributes = attributes;
    notificationPending = true;
    scheduleNotification();
  }
  return snapshot;
}

function flushSnapshot(): void {
  frame = 0;
  const attributes = readObservedAttributes();
  const changed = attributes !== observedAttributes;
  if (changed) {
    snapshot = readThemeSurfaceSnapshot();
    observedAttributes = attributes;
  }
  if (changed || notificationPending) {
    notificationPending = false;
    listeners.forEach((listener) => listener());
  }
}

function scheduleNotification(): void {
  if (!listeners.size || frame || typeof requestAnimationFrame === "undefined") return;
  frame = requestAnimationFrame(flushSnapshot);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!observer && typeof document !== "undefined") {
    observer = new MutationObserver(scheduleNotification);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size) return;
    observer?.disconnect();
    observer = undefined;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    notificationPending = false;
  };
}

export function useThemeSurfaceSnapshot(): ThemeSurfaceSnapshot {
  return useSyncExternalStore(subscribe, readSharedSnapshot, () => FALLBACK_SNAPSHOT);
}
