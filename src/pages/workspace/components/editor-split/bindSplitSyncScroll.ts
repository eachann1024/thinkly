import { createSyncScrollBus, shouldRelayScroll, type SyncScrollBus } from "@/lib/editor-split/syncScroll";
import { isSyncScrollEnabled } from "@/stores/useEditorSplit";

const COAST_MS = 200;
const SCROLL_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
]);

type Arm = { until: number; pointer: boolean };
type LivePane = { pageId: string; el: HTMLDivElement; cleanup: () => void };
type TabSync = { panes: Map<string, LivePane>; bus: SyncScrollBus };

const arms = new WeakMap<HTMLElement, Arm>();
const tabs = new Map<string, TabSync>();

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function armOf(el: HTMLElement): Arm {
  let arm = arms.get(el);
  if (!arm) {
    arm = { until: 0, pointer: false };
    arms.set(el, arm);
  }
  return arm;
}

function armUser(el: HTMLElement): void {
  armOf(el).until = now() + COAST_MS;
}

function userDriven(el: HTMLElement): boolean {
  const arm = arms.get(el);
  return Boolean(arm && (arm.pointer || now() < arm.until));
}

function ensureTab(tabId: string): TabSync {
  const existing = tabs.get(tabId);
  if (existing) return existing;
  const panes = new Map<string, LivePane>();
  const tab: TabSync = {
    panes,
    bus: createSyncScrollBus({
      enabled: () => isSyncScrollEnabled(tabId),
      panes: () =>
        [...panes.entries()].map(([id, pane]) => ({
          id,
          pageId: pane.pageId,
          box: pane.el,
        })),
      apply: (id, scrollTop) => {
        const pane = panes.get(id);
        if (!pane || Math.abs(pane.el.scrollTop - scrollTop) < 0.5) return;
        pane.el.scrollTop = scrollTop;
      },
    }),
  };
  tabs.set(tabId, tab);
  return tab;
}

function listen(tabId: string, paneId: string, el: HTMLDivElement, bus: SyncScrollBus): () => void {
  const onScroll = () => {
    const echoing = bus.consumeEcho(paneId);
    if (!echoing && userDriven(el)) armUser(el);
    if (!shouldRelayScroll({ echoing, enabled: isSyncScrollEnabled(tabId), userDriven: userDriven(el) })) return;
    bus.onUserScroll(paneId);
  };
  const onWheel = () => armUser(el);
  const onPointerDown = () => {
    armOf(el).pointer = true;
    armUser(el);
  };
  const onPointerUp = () => {
    armOf(el).pointer = false;
    armUser(el);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (SCROLL_KEYS.has(event.key)) armUser(el);
  };
  el.addEventListener("scroll", onScroll, { passive: true });
  el.addEventListener("wheel", onWheel, { passive: true });
  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointerup", onPointerUp);
  el.addEventListener("pointercancel", onPointerUp);
  el.addEventListener("keydown", onKeyDown);
  return () => {
    el.removeEventListener("scroll", onScroll);
    el.removeEventListener("wheel", onWheel);
    el.removeEventListener("pointerdown", onPointerDown);
    el.removeEventListener("pointerup", onPointerUp);
    el.removeEventListener("pointercancel", onPointerUp);
    el.removeEventListener("keydown", onKeyDown);
  };
}

export function bindSplitSyncScroll(
  tabId: string,
  paneId: string,
  pageId: string,
  el: HTMLDivElement | null,
): void {
  const existing = tabs.get(tabId);
  if (!el) {
    const previous = existing?.panes.get(paneId);
    previous?.cleanup();
    existing?.panes.delete(paneId);
    if (existing && existing.panes.size === 0) tabs.delete(tabId);
    return;
  }
  const tab = ensureTab(tabId);
  const previous = tab.panes.get(paneId);
  if (previous?.el === el) {
    previous.pageId = pageId;
    return;
  }
  previous?.cleanup();
  tab.panes.set(paneId, {
    pageId,
    el,
    cleanup: listen(tabId, paneId, el, tab.bus),
  });
}
