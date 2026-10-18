import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useReducedMotion } from "motion/react";

/** 距底部多少像素内视为「在底部」，用户回到这里就恢复跟随。 */
const NEAR_BOTTOM = 32;
/** 指数趋近的时间常数：每帧走剩余距离的 1 - e^(-dt/τ)，等价于临界阻尼的无回弹追随。 */
const TAU_MS = 110;
const UP_KEYS = new Set(["PageUp", "ArrowUp", "Home"]);

function distanceToBottom(el: HTMLElement) {
  return el.scrollHeight - el.clientHeight - el.scrollTop;
}

/**
 * 流式回答的贴底跟随：内容增高时平滑追到底部；用户向上滚（滚轮、触摸、键盘或拖动滚动条）立即停止跟随，
 * 向下滚回距底 32px 内恢复。新问题由调用方按 requestId 重新挂载，从跟随状态开始。
 */
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
      // 内容收起导致的回弹也会让 scrollTop 变小，但那时仍贴着底部，不算用户上滚。
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
