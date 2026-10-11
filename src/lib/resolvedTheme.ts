import type { Theme } from "@/stores/settings/types";
export type ResolvedTheme = "light" | "dark";
const listeners = new Set<() => void>();
let media: MediaQueryList | undefined;
function systemMedia(): MediaQueryList | undefined {
  if (!media && typeof window !== "undefined") {
    media = window.matchMedia("(prefers-color-scheme: dark)");
    const changed = () => listeners.forEach((listener) => listener());
    if (media.addEventListener) media.addEventListener("change", changed);
    else media.addListener(changed);
  }
  return media;
}
export function resolveTheme(theme: Theme, systemPrefersDark = systemMedia()?.matches ?? false): ResolvedTheme {
  return theme === "dark" || (theme === "system" && systemPrefersDark) ? "dark" : "light";
}
export function subscribeResolvedTheme(listener: () => void): () => void {
  systemMedia();
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
