import { useEffect, useState } from "react";

/** Canvas/iframe 边界只读取已经解析的语义颜色，不另建明暗色表。 */
export function readThemeSurfaceSnapshot(root?: HTMLElement) {
  const element = root ?? (typeof document === "undefined" ? undefined : document.documentElement);
  const fallback = { background: "#ffffff", foreground: "#1f1e1d", secondary: "#64635e", border: "#d8dee4", hover: "#f2f3f5", selected: "#e8eaed", radius: "8px", gap: "4px", motion: "150ms" };
  if (!element) return fallback;
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
  element.append(probe);
  const color = (value: string, defaultValue: string) => {
    probe.style.color = value;
    return getComputedStyle(probe).color || defaultValue;
  };
  const styles = getComputedStyle(element);
  const value = (name: string, defaultValue: string) => styles.getPropertyValue(name).trim() || defaultValue;
  const result = {
    background: color("hsl(var(--goose-editor-bg))", fallback.background),
    foreground: color("var(--goose-text-primary)", fallback.foreground),
    secondary: color("var(--goose-text-secondary)", fallback.secondary),
    border: color("hsl(var(--border))", fallback.border),
    hover: color("var(--goose-interactive-hover)", fallback.hover),
    selected: color("var(--goose-interactive-selected)", fallback.selected),
    radius: value("--goose-control-radius", fallback.radius),
    gap: value("--goose-menu-row-gap", fallback.gap),
    motion: value("--goose-control-motion-duration", fallback.motion),
  };
  probe.remove();
  return result;
}

export function useThemeSurfaceSnapshot() {
  const [snapshot, setSnapshot] = useState(() => readThemeSurfaceSnapshot());
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setSnapshot(readThemeSurfaceSnapshot()));
    };
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] });
    update();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, []);
  return snapshot;
}
