import { walkLeaves } from "./treePrimitives";
import type { SplitState } from "./types";

export type ScrollMetrics = {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
};

const SCROLL_EPSILON = 0.5;

export function scrollRange(box: ScrollMetrics): number {
  const range = box.scrollHeight - box.clientHeight;
  return Number.isFinite(range) && range > 0 ? range : 0;
}

export function scrollRatio(box: ScrollMetrics): number {
  const range = scrollRange(box);
  if (range <= 0) return 0;
  const ratio = box.scrollTop / range;
  if (!Number.isFinite(ratio)) return 0;
  if (ratio <= 0) return 0;
  if (ratio >= 1) return 1;
  return ratio;
}

export function scrollTopForRatio(box: ScrollMetrics, ratio: number): number {
  const range = scrollRange(box);
  if (range <= 0) return 0;
  const clamped = Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0;
  return clamped * range;
}

export type SyncScrollPane = {
  id: string;
  pageId: string;
  box: ScrollMetrics;
};

export function syncScrollUpdates(
  panes: readonly SyncScrollPane[],
  sourceId: string,
): Array<{ id: string; scrollTop: number }> {
  const source = panes.find((pane) => pane.id === sourceId);
  if (!source) return [];
  const ratio = scrollRatio(source.box);
  const updates: Array<{ id: string; scrollTop: number }> = [];
  for (const pane of panes) {
    if (pane.id === sourceId || pane.pageId !== source.pageId) continue;
    const scrollTop = scrollTopForRatio(pane.box, ratio);
    if (Math.abs(pane.box.scrollTop - scrollTop) < SCROLL_EPSILON) continue;
    updates.push({ id: pane.id, scrollTop });
  }
  return updates;
}

export function syncScrollAvailable(state: SplitState | null | undefined): boolean {
  if (!state) return false;
  const seen = new Set<string>();
  for (const leaf of walkLeaves(state.root)) {
    if (seen.has(leaf.pageId)) return true;
    seen.add(leaf.pageId);
  }
  return false;
}

export function toggleSyncScrollFlag(
  flags: Readonly<Record<string, true>>,
  tabId: string,
): Record<string, true> {
  const next = { ...flags };
  if (next[tabId]) delete next[tabId];
  else next[tabId] = true;
  return next;
}

export function withoutSyncScrollFlag(
  flags: Record<string, true>,
  tabId: string,
): Record<string, true> {
  if (!flags[tabId]) return flags;
  const next = { ...flags };
  delete next[tabId];
  return next;
}

export function parseSyncScrollFlags(raw: string | null): Record<string, true> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const flags: Record<string, true> = {};
    for (const [tabId, value] of Object.entries(parsed)) {
      if (tabId && value === true) flags[tabId] = true;
    }
    return flags;
  } catch {
    return {};
  }
}

export function shouldRelayScroll(input: {
  echoing: boolean;
  enabled: boolean;
  userDriven: boolean;
}): boolean {
  if (input.echoing || !input.enabled) return false;
  return input.userDriven;
}

export type SyncScrollBus = {
  onUserScroll: (paneId: string) => void;
  onScroll: (paneId: string) => void;
  consumeEcho: (paneId: string) => boolean;
  flush: () => void;
};

export function createSyncScrollBus(options: {
  enabled: () => boolean;
  panes: () => readonly SyncScrollPane[];
  apply: (paneId: string, scrollTop: number) => void;
  schedule?: (flush: () => void) => void;
}): SyncScrollBus {
  let scheduled = false;
  let sourceId: string | null = null;
  const echoing = new Set<string>();

  const flush = () => {
    scheduled = false;
    const source = sourceId;
    sourceId = null;
    if (!source || !options.enabled()) return;
    for (const update of syncScrollUpdates(options.panes(), source)) {
      echoing.add(update.id);
      options.apply(update.id, update.scrollTop);
      const landed = options.panes().find((pane) => pane.id === update.id);
      if (!landed || Math.abs(landed.box.scrollTop - update.scrollTop) >= SCROLL_EPSILON) {
        echoing.delete(update.id);
      }
    }
  };

  const scheduleFlush = () => {
    if (scheduled) return;
    scheduled = true;
    if (options.schedule) options.schedule(flush);
    else if (typeof requestAnimationFrame === "function") requestAnimationFrame(flush);
    else flush();
  };

  const bus: SyncScrollBus = {
    consumeEcho(paneId) {
      return echoing.delete(paneId);
    },
    onScroll(paneId) {
      if (echoing.delete(paneId)) return;
      bus.onUserScroll(paneId);
    },
    onUserScroll(paneId) {
      if (!options.enabled() || echoing.delete(paneId)) return;
      sourceId = paneId;
      scheduleFlush();
    },
    flush,
  };
  return bus;
}
