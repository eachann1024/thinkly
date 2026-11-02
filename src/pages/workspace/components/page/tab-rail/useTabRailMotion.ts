import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { RefObject } from "react";
import type { TabItem } from "@/stores/useTabs";
import type { Page } from "@/types";
import { TAB_RAIL_SCROLL_MIN_COUNT } from "../tabRailLayout";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const CLOSE_DURATION = 280;

export interface TabRailMotionInput {
  tab: TabItem;
  pageId: string;
  tabPage?: Page;
}

export interface TabRailMotionItem extends TabRailMotionInput {
  phase: "in" | "live" | "out";
}

function subscribeMotionPreference(listener: () => void) {
  const media = window.matchMedia(REDUCED_MOTION);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

function prefersReducedMotion() {
  return window.matchMedia(REDUCED_MOTION).matches;
}

function sameInputs(a: TabRailMotionInput[], b: TabRailMotionInput[]) {
  return a.length === b.length && a.every((item, index) => {
    const other = b[index];
    return item.tab === other.tab && item.pageId === other.pageId && item.tabPage === other.tabPage;
  });
}

function reconcileItems(
  previous: TabRailMotionItem[],
  inputs: TabRailMotionInput[],
  reducedMotion: boolean,
): TabRailMotionItem[] {
  const previousById = new Map(previous.map((item) => [item.tab.id, item]));
  const next: TabRailMotionItem[] = inputs.map((input) => {
    const old = previousById.get(input.tab.id);
    return {
      ...input,
      phase: reducedMotion ? "live" : old && old.phase !== "out" ? old.phase : "in",
    };
  });
  if (reducedMotion) return next;
  const liveIds = new Set(inputs.map((item) => item.tab.id));
  previous.forEach((item, index) => {
    if (liveIds.has(item.tab.id)) return;
    // Keep removals before their next surviving neighbour, including batch closes.
    const anchor = previous.slice(index + 1).find((entry) => liveIds.has(entry.tab.id));
    const anchorIndex = anchor ? next.findIndex((entry) => entry.tab.id === anchor.tab.id) : next.length;
    next.splice(anchorIndex, 0, { ...item, phase: "out" });
  });
  return next;
}

export function useTabRailMotion(
  inputs: TabRailMotionInput[],
  scrollerRef: RefObject<HTMLDivElement | null>,
) {
  const reducedMotion = useSyncExternalStore(subscribeMotionPreference, prefersReducedMotion, () => true);
  const [state, setState] = useState(() => ({
    inputs,
    reducedMotion,
    items: inputs.map((input): TabRailMotionItem => ({ ...input, phase: "live" })),
  }));
  let items = state.items;
  if (!sameInputs(state.inputs, inputs) || state.reducedMotion !== reducedMotion) {
    items = reconcileItems(state.items, inputs, reducedMotion);
    setState({ inputs, reducedMotion, items });
  }
  const [railSize, setRailSize] = useState<{ width: number; gap: number }>();
  const pending = useRef(new Map<string, { phase: "in" | "out"; cancel: () => void }>());

  useLayoutEffect(() => {
    const rail = scrollerRef.current;
    if (!rail) return;
    const measure = () => {
      const style = getComputedStyle(rail);
      const width = rail.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const gap = parseFloat(style.getPropertyValue("--tab-rail-gap"));
      setRailSize((current) => current?.width === width && current.gap === gap ? current : { width, gap });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    return () => observer.disconnect();
  }, [scrollerRef]);

  useLayoutEffect(() => {
    const scheduled = pending.current;
    for (const [id, task] of scheduled) {
      if (!items.some((item) => item.tab.id === id && item.phase === task.phase)) {
        task.cancel();
        scheduled.delete(id);
      }
    }
    for (const item of items) {
      const { id } = item.tab;
      if (item.phase === "live" || scheduled.has(id)) continue;
      const phase = item.phase;
      const finish = () => {
        scheduled.delete(id);
        setState((current) => ({
          ...current,
          items: phase === "out"
            ? current.items.filter((entry) => entry.tab.id !== id || entry.phase !== "out")
            : current.items.map((entry) => entry.tab.id === id && entry.phase === "in"
              ? { ...entry, phase: "live" }
              : entry),
        }));
      };
      if (phase === "out") {
        const timer = window.setTimeout(finish, CLOSE_DURATION);
        scheduled.set(id, { phase, cancel: () => window.clearTimeout(timer) });
      } else {
        // Commit a painted zero-width slot before setting its target width.
        let frame = requestAnimationFrame(() => {
          frame = requestAnimationFrame(finish);
        });
        scheduled.set(id, { phase, cancel: () => cancelAnimationFrame(frame) });
      }
    }
  }, [items]);

  useLayoutEffect(() => {
    const scheduled = pending.current;
    return () => {
      scheduled.forEach((task) => task.cancel());
      scheduled.clear();
    };
  }, []);

  const sizingItems = items.filter((item) => item.phase === "live");
  const sizingCount = sizingItems.length;
  const slotWidth = railSize === undefined ? undefined
    : sizingCount >= TAB_RAIL_SCROLL_MIN_COUNT ? 155
      : Math.max(0, railSize.width - Math.max(0, sizingCount - 1) * railSize.gap) / Math.max(1, sizingCount);
  return {
    items,
    slotWidth,
    gap: railSize?.gap ?? 0,
    gapAfter: new Set(sizingItems.slice(0, -1).map((item) => item.tab.id)),
    closing: items.some((item) => item.phase === "out"),
  };
}
