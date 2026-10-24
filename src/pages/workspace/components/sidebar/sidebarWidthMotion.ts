import { animate } from "motion/react";

/** 与 --workspace-sidebar-motion 同一条曲线。 */
export const SIDEBAR_WIDTH_MOTION_MS = 200;
const SIDEBAR_WIDTH_EASE = [0.16, 1, 0.3, 1] as const;

/**
 * 只有收起和展开才补间。拖把手、窗口连续变窄时的宽度钳制保持跟手。
 * previous 为 null 表示首次写入，直接落位。
 */
export function shouldAnimateSidebarWidth(previous: number | null, next: number) {
  if (previous === null) return false;
  return (previous <= 0) !== (next <= 0);
}

type Running = { stop: () => void; target: number };
const running = new WeakMap<HTMLElement, Running>();

function readWidth(shell: HTMLElement) {
  const raw = Number.parseFloat(shell.style.getPropertyValue("--workspace-sidebar-width"));
  if (Number.isFinite(raw)) return raw;
  return shell.querySelector<HTMLElement>(".workspace-sidebar-pane")?.getBoundingClientRect().width ?? 0;
}

export function setWorkspaceSidebarWidth(shell: HTMLElement, width: number, motion: boolean) {
  const next = Math.max(0, width);
  const current = running.get(shell);
  if (current && Math.abs(current.target - next) < 0.5) return;
  current?.stop();
  running.delete(shell);
  const pane = shell.querySelector<HTMLElement>(".workspace-sidebar-pane");
  pane?.removeAttribute("data-sidebar-width-motion");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!motion || reduced) {
    shell.style.setProperty("--workspace-sidebar-width", `${next}px`);
    return;
  }
  const from = readWidth(shell);
  if (Math.abs(from - next) < 0.5) {
    shell.style.setProperty("--workspace-sidebar-width", `${next}px`);
    return;
  }
  pane?.setAttribute("data-sidebar-width-motion", "");
  const entry: Running = { stop: () => undefined, target: next };
  running.set(shell, entry);
  const controls = animate(from, next, {
    duration: SIDEBAR_WIDTH_MOTION_MS / 1000,
    ease: SIDEBAR_WIDTH_EASE,
    onUpdate: (value) => {
      shell.style.setProperty("--workspace-sidebar-width", `${value}px`);
    },
    onComplete: () => {
      if (running.get(shell) !== entry) return;
      running.delete(shell);
      shell.style.setProperty("--workspace-sidebar-width", `${next}px`);
      pane?.removeAttribute("data-sidebar-width-motion");
    },
  });
  entry.stop = () => controls.stop();
}
