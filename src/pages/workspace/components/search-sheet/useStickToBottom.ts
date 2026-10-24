import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useReducedMotion } from "motion/react";

const NEAR_BOTTOM = 32;
const TAU_MS = 110;
const UP_KEYS = new Set(["PageUp", "ArrowUp", "Home"]);

function distanceToBottom(el: HTMLElement) {
  return el.scrollHeight - el.clientHeight - el.scrollTop;
}

export function useStickToBottom(scrollRef: RefObject<HTMLElement | null>) {
  const reduce = useReducedMotion();
  const [following, setFollowingState] = useState(true);
  const followingRef = useRef(true);
  const frame = useRef(0);
  const lastTop = useRef(0);
  const lastTime = useRef(0);

  const setFollowing = useCallback((value: boolean) => {
    followingRef.current = value;
    setFollowingState(value);
    if (!value && frame.current) { cancelAnimationFrame(frame.current); frame.current = 0; }
  }, []);

  const follow = useCallback(() => {
    if (!followingRef.current || frame.current) return;
    lastTime.current = 0;
    const step = (time: number) => {
      const el = scrollRef.current;
      frame.current = 0;
      if (!el || !followingRef.current) return;
      const target = el.scrollHeight - el.clientHeight;
      const gap = target - el.scrollTop;
      if (gap <= 0.5) { lastTop.current = el.scrollTop; return; }
      const dt = lastTime.current ? Math.min(64, time - lastTime.current) : 16;
      lastTime.current = time;
      const next = reduce ? target : el.scrollTop + Math.max(1, gap * (1 - Math.exp(-dt / TAU_MS)));
      el.scrollTop = Math.min(target, next);
      lastTop.current = el.scrollTop;
      frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  }, [scrollRef, reduce]);

  const jumpToLatest = useCallback(() => { setFollowing(true); follow(); }, [setFollowing, follow]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    lastTop.current = el.scrollTop;
    const stop = () => { if (followingRef.current && distanceToBottom(el) > 1) setFollowing(false); };
    const onWheel = (event: WheelEvent) => { if (event.deltaY < 0) stop(); };
    const onKey = (event: KeyboardEvent) => { if (UP_KEYS.has(event.key)) stop(); };
    const onScroll = () => {
      const top = el.scrollTop;
      const movedUp = top < lastTop.current - 1;
      lastTop.current = top;
      if (movedUp && distanceToBottom(el) > NEAR_BOTTOM) { stop(); return; }
      if (!movedUp && !followingRef.current && distanceToBottom(el) <= NEAR_BOTTOM) setFollowing(true);
    };
    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("touchmove", stop, { passive: true });
    el.addEventListener("keydown", onKey);
    el.addEventListener("scroll", onScroll, { passive: true });
    const observer = new ResizeObserver(follow);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchmove", stop);
      el.removeEventListener("keydown", onKey);
      el.removeEventListener("scroll", onScroll);
      observer.disconnect();
      if (frame.current) { cancelAnimationFrame(frame.current); frame.current = 0; }
    };
  }, [scrollRef, follow, setFollowing]);

  return { following, jumpToLatest };
}
