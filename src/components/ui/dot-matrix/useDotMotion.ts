import { useLayoutEffect, useRef } from "react";
import { pauseDotLoops, releaseDotLoops, resumeDotLoops } from "./dotLoopController";


type Entry = {
  el: Element;
  visible: boolean;
  entryGroups: number;
  completedGroups: Set<Element>;
  onAnimationEnd: (event: AnimationEvent) => void;
};
const entries = new Map<Element, Entry>();
const played = new WeakSet<Element>();
const pending = new Set<Element>();
let frame = 0;
let observer: IntersectionObserver | null = null;
let visibilityBound = false;
let motionQuery: MediaQueryList | null = null;
let motionBound = false;

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

function flush() {
  frame = 0;
  pending.forEach((el) => {
    const entry = entries.get(el);
    if (!entry || el.getAttribute("data-dm-phase") !== "pre") return;
    el.setAttribute("data-dm-phase", "in");
    resumeDotLoops(el);
    if (entry.entryGroups === 0) {
      played.add(el);
      el.setAttribute("data-dm-played", "");
    }
  });
  pending.clear();
}

function apply(entry: Entry) {
  const { el, visible } = entry;
  const phase = el.getAttribute("data-dm-phase");
  if (reducedMotion()) {
    releaseDotLoops(el);
    pending.delete(el);
    el.setAttribute("data-dm-phase", "static");
    el.removeAttribute("data-dm-paused");
    return;
  }
  if (!visible || document.hidden) {
    pauseDotLoops(el);
    pending.delete(el);
    el.setAttribute("data-dm-paused", "");
    return;
  }
  el.removeAttribute("data-dm-paused");
  if (phase === "in") resumeDotLoops(el);
  if (phase === "pre" && !pending.has(el)) {
    pending.add(el);
    if (!frame) frame = requestAnimationFrame(flush);
  }
}

function onVisibilityChange() {
  entries.forEach(apply);
}

function onMotionPreferenceChange() {
  const staticMotion = reducedMotion();
  entries.forEach((entry) => {
    const { el } = entry;
    if (staticMotion) {
      releaseDotLoops(el);
      pending.delete(el);
      if (el.getAttribute("data-dm-phase") === "in") {
        played.add(el);
        el.setAttribute("data-dm-played", "");
      }
      el.setAttribute("data-dm-phase", "static");
      el.removeAttribute("data-dm-paused");
      return;
    }
    const wasPlayed = played.has(el) || el.hasAttribute("data-dm-played");
    el.setAttribute("data-dm-phase", wasPlayed ? "in" : "pre");
    if (wasPlayed) el.setAttribute("data-dm-played", "");
    apply(entry);
  });
}

function onEntryAnimationEnd(entry: Entry, event: AnimationEvent) {
  const target = event.target;
  if (
    !(target instanceof Element) ||
    !target.classList.contains("goose-dm-rg") ||
    event.animationName !== "goose-dm-enter"
  )
    return;
  entry.completedGroups.add(target);
  if (entry.completedGroups.size >= entry.entryGroups) {
    played.add(entry.el);
    entry.el.setAttribute("data-dm-played", "");
  }
}

function getObserver() {
  if (observer || typeof IntersectionObserver === "undefined") return observer;
  observer = new IntersectionObserver(
    (records) => {
      for (const record of records) {
        const entry = entries.get(record.target);
        if (!entry) continue;
        entry.visible = record.isIntersecting;
        apply(entry);
      }
    },
    { threshold: 0.15 },
  );
  return observer;
}

function register(el: Element) {
  const io = getObserver();
  const priorPhase = el.getAttribute("data-dm-phase");
  const phaseWasIn = priorPhase === "in";
  const staticMotion = reducedMotion();
  const wasPlayed =
    played.has(el) ||
    el.hasAttribute("data-dm-played") ||
    (phaseWasIn && staticMotion);
  if (wasPlayed) {
    played.add(el);
    el.setAttribute("data-dm-played", "");
  }
  const entry: Entry = {
    el,
    visible: !io,
    entryGroups: el.querySelectorAll(".goose-dm-rg").length,
    completedGroups: new Set<Element>(),
    onAnimationEnd: () => undefined,
  };
  entry.onAnimationEnd = (event) => onEntryAnimationEnd(entry, event);
  el.addEventListener("animationend", entry.onAnimationEnd as EventListener);
  entries.set(el, entry);
  el.setAttribute(
    "data-dm-phase",
    staticMotion ? "static" : phaseWasIn || wasPlayed ? "in" : "pre",
  );
  if (!visibilityBound) {
    document.addEventListener("visibilitychange", onVisibilityChange);
    visibilityBound = true;
  }
  if (!motionBound && typeof window !== "undefined" && window.matchMedia) {
    motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    motionQuery.addEventListener("change", onMotionPreferenceChange);
    motionBound = true;
  }
  if (io) io.observe(el);
  apply(entry);
  return () => {
    releaseDotLoops(el);
    el.setAttribute("data-dm-paused", "");
    io?.unobserve(el);
    el.removeEventListener(
      "animationend",
      entry.onAnimationEnd as EventListener,
    );
    entries.delete(el);
    pending.delete(el);
    if (!pending.size && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
    if (entries.size === 0 && visibilityBound) {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      visibilityBound = false;
    }
    if (entries.size === 0 && motionBound) {
      motionQuery?.removeEventListener("change", onMotionPreferenceChange);
      motionQuery = null;
      motionBound = false;
    }
  };
}

export function useDotMotion<T extends Element = SVGSVGElement>() {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    return el ? register(el) : undefined;
  }, []);
  return ref;
}

export const DOT_MOTION_INITIAL = { "data-dm-phase": "pre" } as const;
