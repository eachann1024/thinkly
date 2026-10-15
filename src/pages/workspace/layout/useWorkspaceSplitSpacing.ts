import { useLayoutEffect, useRef } from "react";
import "../styles/workspace/split-spacing.css";

const MOTION_TARGETS = [
  ":scope > .sidebar-rail-shell",
  ":scope > .workspace-sidebar-pane > .sidebar-size-container",
  ":scope > .workspace-main-sheet",
].join(",");

export function useWorkspaceSplitSpacing(enabled: boolean) {
  const stageRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const animations = useRef<Animation[]>([]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const animate = initialized.current && !window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    initialized.current = true;
    if (stage.hasAttribute("data-split-spacing") === enabled) return;

    animations.current.forEach((animation) => animation.cancel());
    // 留白一次落定，只过渡透明度，避免尺寸观察器逐帧更新和正文缩放。
    stage.toggleAttribute("data-split-spacing", enabled);
    // 同步刷新挂在 body 上的光标与浮层；每次布局切换只通知一次。
    const frame = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
    animations.current = animate
      ? Array.from(stage.querySelectorAll<HTMLElement>(MOTION_TARGETS)).map(
        (target) => target.animate(
          [{ opacity: 0.84 }, { opacity: 1 }],
          { duration: 180, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
        ),
      )
      : [];
    return () => window.cancelAnimationFrame(frame);
  }, [enabled]);

  useLayoutEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stopAnimations = () => {
      animations.current.forEach((animation) => animation.cancel());
      animations.current = [];
    };
    preference.addEventListener("change", stopAnimations);
    return () => {
      preference.removeEventListener("change", stopAnimations);
      stopAnimations();
    };
  }, []);

  return stageRef;
}
