const AI_SURFACE_SELECTOR =
  '[data-ai-panel-layout], .electron-ai-header, [data-ai-conversation-header="true"]';
const TAB_SURFACE_SELECTOR = "[data-workspace-tab-rail], [data-tab-id]";

type CloseTarget = "ai" | "tab";

function targetSurface(target: Element | null): CloseTarget | null {
  if (!target) return null;
  if (target.closest(TAB_SURFACE_SELECTOR)) return "tab";
  if (target.closest(AI_SURFACE_SELECTOR)) return "ai";
  if (target.closest(".workspace-shell")) return "tab";
  return null;
}

export function createCloseTargetTracker(root: Document) {
  let lastTarget: Element | null = null;

  const recordTarget = (event: Event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (targetSurface(target)) lastTarget = target;
  };

  return {
    install() {
      // Blank areas may leave activeElement in the other pane.
      root.addEventListener("pointerdown", recordTarget, true);
      root.addEventListener("focusin", recordTarget, true);
      return () => {
        root.removeEventListener("pointerdown", recordTarget, true);
        root.removeEventListener("focusin", recordTarget, true);
        lastTarget = null;
      };
    },
    isAiPanelTarget() {
      const recent = lastTarget?.isConnected ? targetSurface(lastTarget) : null;
      const current = recent ?? targetSurface(root.activeElement);
      if (current) return current === "ai";
      return Boolean(root.querySelector('[data-ai-panel-layout="fullscreen"]'));
    },
  };
}
