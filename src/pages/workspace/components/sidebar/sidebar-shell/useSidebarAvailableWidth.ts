import { useLayoutEffect, useState, type RefObject } from "react";
import { SIDEBAR_MAX_WIDTH } from "../hooks/useSidebarResize";

/** 为轨道、留白和正文预留实际空间，不回写用户拖出的宽度。 */
export function useSidebarAvailableWidth(sidebarRef: RefObject<HTMLDivElement | null>) {
  const [maxWidth, setMaxWidth] = useState(SIDEBAR_MAX_WIDTH);
  useLayoutEffect(() => {
    const stage = sidebarRef.current?.closest<HTMLElement>(".workspace-stage");
    if (!stage) return;
    const observer = new ResizeObserver(update);
    const observed = new Set<Element>();
    function update() {
      if (!stage) return;
      const rail = stage.querySelector<HTMLElement>(":scope > .sidebar-rail-shell");
      const main = stage.querySelector<HTMLElement>(":scope > .workspace-main-sheet");
      const columns = main?.querySelector<HTMLElement>(".workspace-content-columns");
      const ai = stage.querySelector<HTMLElement>('[data-ai-panel-layout="side-panel"]');
      for (const node of [stage, rail, main, columns, ai]) {
        if (node && !observed.has(node)) { observed.add(node); observer.observe(node); }
      }
      for (const node of observed) {
        if (!node.isConnected) { observer.unobserve(node); observed.delete(node); }
      }
      const style = getComputedStyle(stage);
      const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const mainStyle = main ? getComputedStyle(main) : null;
      const margin = mainStyle ? parseFloat(mainStyle.marginLeft) + parseFloat(mainStyle.marginRight) : 0;
      const gap = ai && columns ? parseFloat(getComputedStyle(columns).columnGap) || 0 : 0;
      const occupied = (rail?.getBoundingClientRect().width ?? 0) +
        (ai?.getBoundingClientRect().width ?? 0) + margin + gap;
      const next = Math.max(0, Math.min(SIDEBAR_MAX_WIDTH, stage.clientWidth - padding - occupied - 360));
      setMaxWidth((previous) => Math.abs(previous - next) < 0.5 ? previous : next);
    }
    const panelSelector = '[data-ai-panel-layout="side-panel"]';
    const mutations = new MutationObserver((records) => {
      if (records.some((record) => record.type === "attributes" ||
        [...record.addedNodes, ...record.removedNodes].some((node) =>
          node instanceof Element && (node.matches(panelSelector) || node.querySelector(panelSelector)),
        ))) update();
    });
    mutations.observe(stage, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ["data-ai-panel-layout", "data-split-spacing"],
    });
    update();
    return () => { observer.disconnect(); mutations.disconnect(); };
  }, [sidebarRef]);
  return maxWidth;
}
