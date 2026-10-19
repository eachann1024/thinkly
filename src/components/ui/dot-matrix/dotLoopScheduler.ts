import { createLoopClock, loopOffsets } from "./loopClock";

const clock = createLoopClock({
  now: () => performance.now(),
  schedule: (callback, delay) => setTimeout(callback, delay),
  cancel: (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>),
});
type Control = ReturnType<typeof clock.add>;
type Loop = { animation: CSSAnimation; target: Element; name: string; duration: number; delay: number; control: Control };
type Root = { el: Element; active: boolean; loops: Map<CSSAnimation, Loop> };
const roots = new Map<Element, Root>();
const remembered = new WeakMap<Element, Map<string, number>>();
let observer: MutationObserver | null = null;
let observerRebuildPending = false;
const loopNames = new Set([
  "goose-dm-main-drift", "goose-dm-small-drift", "goose-dm-corner-drift",
  "goose-dm-breathe", "goose-dm-ripple", "goose-dm-glint", "goose-dm-flow", "goose-dm-wave", "goose-dm-progress",
  "goose-cs-float-lg", "goose-cs-float-sm", "goose-cs-blink", "goose-cs-blink-open",
  "goose-cs-blink-twice", "goose-cs-blink-twice-open",
]);
const rootSelector = ".goose-dm,.goose-cs";

function remember(loop: Loop) {
  let times = remembered.get(loop.target);
  if (!times) remembered.set(loop.target, times = new Map());
  const time = loop.control.time();
  times.set(loop.name, time);
  loop.control.remove();
  // Activity may retain the DOM, while display:none cancels its CSSAnimation.
  if (loop.animation.playState !== "idle") loop.animation.currentTime = time;
}

/** Only discover this registered illustration after a lifecycle or local DOM/style change. */
function refresh(root: Root) {
  const candidates = root.el.getAnimations({ subtree: true }).flatMap((animation) => {
    if (!(animation instanceof CSSAnimation) || !loopNames.has(animation.animationName)) return [];
    const target = animation.effect instanceof KeyframeEffect ? animation.effect.target : null;
    const timing = animation.effect?.getTiming();
    if (!(target instanceof Element) || target.closest(rootSelector) !== root.el
      || timing?.iterations !== Infinity || timing.direction !== "normal"
      || typeof timing.duration !== "number" || timing.duration <= 0 || !Number.isFinite(timing.duration)) return [];
    return [{ animation, target, duration: timing.duration, delay: timing.delay ?? 0 }];
  });
  const live = new Set(candidates.map(({ animation }) => animation));
  clock.batch(() => {
    // display:none cancels CSSAnimation objects without unmounting the root. Save their
    // phase before a replacement for the same target/name reads the remembered time.
    for (const [animation, loop] of root.loops) if (!live.has(animation)) {
      remember(loop);
      root.loops.delete(animation);
    }
    for (const { animation, target, duration, delay } of candidates) {
      let loop = root.loops.get(animation);
      if (loop && (loop.duration !== duration || loop.delay !== delay)) {
        remember(loop);
        root.loops.delete(animation);
        loop = undefined;
      }
      if (!loop) {
        const name = animation.animationName;
        const time = remembered.get(target)?.get(name) ?? (typeof animation.currentTime === "number" ? animation.currentTime : 0);
        animation.pause();
        // Settles a pending pause synchronously, including the original negative delay phase.
        animation.currentTime = time;
        const control = clock.add({
          time, duration, delay, offsets: loopOffsets(name),
          write(value) { if (animation.playState !== "idle") animation.currentTime = value; },
        });
        loop = { animation, target, name, duration, delay, control };
        root.loops.set(animation, loop);
      }
      loop.control.setActive(root.active);
    }
  });
}

function observeRoot(el: Element) {
  observer ??= new MutationObserver((records) => {
    const dirty = new Set<Root>();
    for (const record of records) {
      const target = record.target instanceof Element ? record.target : record.target.parentElement;
      const el = target && (roots.has(target) ? target : target.closest(rootSelector));
      const root = el && roots.get(el);
      if (root) dirty.add(root);
    }
    for (const root of dirty) refresh(root);
  });
  observer.observe(el, {
    subtree: true, childList: true, attributes: true, attributeFilter: ["class", "style"],
  });
}

function removeObservation() {
  if (!roots.size) { observer?.disconnect(); observer = null; return; }
  if (observerRebuildPending) return;
  observerRebuildPending = true;
  queueMicrotask(() => {
    observerRebuildPending = false;
    observer?.disconnect();
    for (const el of roots.keys()) observeRoot(el);
  });
}

export function resumeDotLoops(el: Element) {
  if (!el.matches(rootSelector)) return;
  let root = roots.get(el);
  if (!root) {
    root = { el, active: true, loops: new Map() };
    roots.set(el, root);
    observeRoot(el);
  }
  el.setAttribute("data-dm-clock", "boundary");
  root.active = true;
  refresh(root);
}

export function pauseDotLoops(el: Element) {
  const root = roots.get(el);
  if (!root) return;
  root.active = false;
  clock.batch(() => { for (const loop of root.loops.values()) loop.control.setActive(false); });
}

export function releaseDotLoops(el: Element) {
  const root = roots.get(el);
  if (!root) return;
  clock.batch(() => { for (const loop of root.loops.values()) remember(loop); });
  root.loops.clear();
  roots.delete(el);
  el.removeAttribute("data-dm-clock");
  removeObservation();
}
