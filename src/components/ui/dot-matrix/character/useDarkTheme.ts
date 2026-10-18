import { useSyncExternalStore } from "react";

/** 跟随根节点的 .dark 类：主窗口与其他窗口都由 applyTheme 写入。 */
const listeners = new Set<() => void>();
let observer: MutationObserver | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!observer && typeof MutationObserver !== "undefined") {
    observer = new MutationObserver(() => listeners.forEach((fn) => fn()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      observer?.disconnect();
      observer = null;
    }
  };
}

const isDark = () => document.documentElement.classList.contains("dark");

export function useDarkTheme(): boolean {
  return useSyncExternalStore(subscribe, isDark, () => false);
}
