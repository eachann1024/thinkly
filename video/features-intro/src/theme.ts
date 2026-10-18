import { Easing, interpolate, spring } from "remotion";

export const WIDTH = 1920;
export const HEIGHT = 1080;
export const FPS = 60;
export const BEAT = 30;

export const SCENES = {
  intro: { from: 0, len: 300 },
  blocks: { from: 300, len: 450 },
  ai: { from: 750, len: 450 },
  quick: { from: 1200, len: 450 },
  split: { from: 1650, len: 450 },
  share: { from: 2100, len: 450 },
  history: { from: 2550, len: 450 },
  outro: { from: 3000, len: 360 },
} as const;

export const DURATION = SCENES.outro.from + SCENES.outro.len;

// 浅色 Ocean 主题，取值同 DESIGN.md 与 theme-tokens.css。
export const C = {
  stage: "#e9e9e7",
  shell: "#f1f1f1",
  sidebar: "#fafafa",
  paper: "#ffffff",
  menu: "#ffffff",
  text: "#1f1e1d",
  text2: "#5e5d59",
  text3: "#8a8983",
  accent: "#547dd0",
  hover: "#eef3fc",
  selected: "#e5edfc",
  drop: "#3b82f6",
  line: "#ebebea",
  border: "rgba(31,30,29,0.10)",
  skeleton: "#ededeb",
  skeletonHi: "#f6f6f5",
};

export const FONT_UI =
  '"Inter Var", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
export const FONT_MONO = '"JB Mono", "PingFang SC", monospace';

export const MENU_SHADOW =
  "0 0 0 1px rgba(31,30,29,0.08), 0 8px 24px rgba(31,30,29,0.10), 0 2px 6px rgba(31,30,29,0.06)";

const EASE = Easing.bezier(0.22, 1, 0.36, 1);

export function ramp(frame: number, from: number, to: number, ease = EASE) {
  return interpolate(frame, [from, to], [0, 1], {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function pop(frame: number, start: number, damping = 16) {
  if (frame < start) return 0;
  return spring({ frame: frame - start, fps: FPS, config: { damping, stiffness: 170, mass: 0.9 } });
}

export type Key = [frame: number, x: number, y: number];

/** 指针轨迹：关键帧之间缓动移动，停留即保持。 */
export function track(frame: number, keys: Key[]) {
  if (frame <= keys[0][0]) return { x: keys[0][1], y: keys[0][2] };
  for (let i = 1; i < keys.length; i += 1) {
    const [f1, x1, y1] = keys[i];
    const [f0, x0, y0] = keys[i - 1];
    if (frame <= f1) {
      const t = ramp(frame, f0, f1, Easing.bezier(0.45, 0, 0.2, 1));
      return { x: lerp(x0, x1, t), y: lerp(y0, y1, t) };
    }
  }
  const last = keys[keys.length - 1];
  return { x: last[1], y: last[2] };
}

/** 场景首尾的内容显隐：开头由骨架填充，结尾退回骨架。 */
export function sceneFill(frame: number, len: number, inStart = 6, inLen = 30) {
  return ramp(frame, inStart, inStart + inLen) * (1 - ramp(frame, len - 18, len - 4));
}

/** 按帧逐字显示，速度为每秒字符数。 */
export function typed(text: string, frame: number, start: number, cps = 14) {
  const n = Math.max(0, Math.floor(((frame - start) / FPS) * cps));
  return Array.from(text).slice(0, n).join("");
}
