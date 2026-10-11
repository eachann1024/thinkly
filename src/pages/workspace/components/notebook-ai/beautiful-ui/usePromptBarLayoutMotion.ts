import { useLayoutEffect, type RefObject } from "react";

/** Input geometry follows each edit immediately; only newly revealed controls fade in. */
export function usePromptBarLayoutMotion(ref: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const bar = ref.current;
    if (!bar) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let expanded = bar.dataset.expanded;
    let animations: Animation[] = [];
    const observer = new MutationObserver(() => {
      const next = bar.dataset.expanded;
      if (next === expanded) return;
      expanded = next;
      animations.forEach((animation) => animation.cancel());
      animations = [];
      if (reducedMotion.matches || next !== "true") return;
      const shell = bar.querySelector(".notebook-ai-composer-shell");
      for (const node of shell?.children ?? []) {
        if (!(node instanceof HTMLElement) || node.querySelector("[data-ai-composer-editor]")) continue;
        animations.push(node.animate([{ opacity: 0.65 }, { opacity: 1 }], { duration: 100, easing: "ease-out" }));
      }
    });
    observer.observe(bar, { attributes: true, attributeFilter: ["data-expanded"] });
    return () => {
      observer.disconnect();
      animations.forEach((animation) => animation.cancel());
    };
  }, [ref]);
}
