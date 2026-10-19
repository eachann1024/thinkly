/** 点阵循环：低频取样但持续循环，保留入场、错误反馈、暂停、减弱动效与坐标。 */
import { readFileSync } from "node:fs";
import path from "node:path";
import postcss, { type AtRule, type Root, type Rule } from "postcss";
import { DOT_MOTION, entryIndex, loopVars, rippleDelay } from "../../src/components/ui/dot-matrix/motion";
import { grid, line, memoDots, ringBuckets, sample } from "../../src/components/ui/dot-matrix/geometry";
import { createChecker } from "./lib/check";

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");
const compact = (value: string) => value.replace(/\s+/g, " ").trim();
const css = postcss.parse(read("src/components/ui/dot-matrix/dot-matrix.css"));
const vars = (options: Parameters<typeof loopVars>[0]) => loopVars(options) as Record<string, string>;

function rule(selector: string, parent: Root | AtRule = css): Rule | undefined {
  return parent.nodes?.find((node): node is Rule => node.type === "rule" && node.selector === selector);
}

function declaration(selector: string, property: string, parent: Root | AtRule = css) {
  return rule(selector, parent)?.nodes.find((node) => node.type === "decl" && node.prop === property);
}

function value(selector: string, property: string, parent: Root | AtRule = css) {
  const node = declaration(selector, property, parent);
  return node?.type === "decl" ? compact(node.value) : "";
}

type Frames = Record<string, Record<string, string>>;

/** 固定原关键帧的时点与幅度；只允许循环取样曲线发生变化。 */
const frames: Record<string, Frames> = {
  "goose-dm-main-drift": {
    "0%,100%": { transform: "translateY(0) scale(1)" },
    "50%": { transform: "translateY(-0.65px) scale(1.006)" },
  },
  "goose-dm-small-drift": {
    "0%,100%": { transform: "translateY(0) scale(1)" },
    "50%": { transform: "translateY(-0.35px) scale(1.006)" },
  },
  "goose-dm-corner-drift": {
    "0%,100%": { transform: "translateY(0) scale(1)" },
    "50%": { transform: "translateY(-0.35px) scale(1.004)" },
  },
  "goose-dm-enter": { from: { opacity: "0", transform: "scale(0.985)" } },
  "goose-dm-breathe": {
    "0%,100%": { opacity: "1" },
    "50%": { opacity: "var(--dm-loop-low, 0.9)" },
  },
  "goose-dm-ripple": {
    "0%,100%": { opacity: "1" },
    "50%": { opacity: "var(--dm-loop-low, 0.9)" },
  },
  "goose-dm-glint": {
    "0%,100%": { opacity: "1", transform: "scale(1)" },
    "28%": { opacity: "0.92" },
    "68%": { opacity: "0.96", transform: "scale(1.006)" },
  },
  "goose-dm-flow": { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.94" } },
  "goose-dm-wave": {
    "0%,100%": { transform: "translateY(-0.35px)" },
    "50%": { transform: "translateY(0.35px)" },
  },
  "goose-dm-progress": { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.9" } },
  "goose-dm-shake": {
    "25%": { transform: "translateX(-0.8px)" },
    "50%": { transform: "translateX(0.8px)" },
    "75%": { transform: "translateX(-0.4px)" },
  },
};

function keyframes(name: string): Frames | undefined {
  const at = css.nodes.find((node): node is AtRule => node.type === "atrule" && node.name === "keyframes" && node.params === name);
  if (!at) return undefined;
  return Object.fromEntries((at.nodes ?? []).filter((node): node is Rule => node.type === "rule").map((frame) => [
    frame.selector.replace(/\s/g, ""),
    Object.fromEntries(frame.nodes.filter((node) => node.type === "decl").map((node) =>
      node.type === "decl" ? [node.prop, compact(node.value)] : [])),
  ]));
}

export default function run(): number {
  const checker = createChecker();
  const { check } = checker;
  check("循环变量与 TS 一致，原交互曲线保留",
    value(".goose-dm", "--dm-loop-ease") === DOT_MOTION.loopEasing
      && DOT_MOTION.loopEasing === "steps(2, end)"
      && value(".goose-dm", "--dm-ease") === DOT_MOTION.easing
      && DOT_MOTION.easing === "cubic-bezier(0.45, 0, 0.55, 1)");

  for (const [name, duration, delay] of [["main", "12s", "-6s"], ["small", "11s", "-5.5s"], ["corner", "14s", "-7s"]]) {
    check(`${name} 整图仍按原周期与相位无限循环`,
      value(`.goose-dm[data-dm-phase="in"].goose-dm-${name}`, "animation")
        === `goose-dm-${name}-drift ${duration} var(--dm-loop-ease) ${delay} infinite both`);
  }
  for (const [name, duration, delay] of [
    ["breathe", "12s", "-6s"], ["ripple", "12s", "-6s"], ["glint", "9s", "-7s"],
    ["flow", "10s", "-5s"], ["wave", "10s", "-5s"], ["progress", "4s", "-2s"],
  ]) {
    check(`${name} 分组仍按原周期与相位无限循环`,
      value(`.goose-dm[data-dm-phase="in"] .goose-dm-${name}`, "animation")
        === `goose-dm-${name} var(--dm-period, ${duration}) var(--dm-loop-ease) var(--dm-delay, ${delay}) infinite both`);
  }
  check("错误仍为一次平滑短促反馈，之后低频无限呼吸",
    value('.goose-dm[data-dm-phase="in"] .goose-dm-alert', "animation")
      === "goose-dm-shake 280ms cubic-bezier(0.36, 0.07, 0.19, 0.97) var(--dm-alert-delay, 0.4s) 1 backwards, goose-dm-breathe var(--dm-period, 10s) var(--dm-loop-ease) var(--dm-delay, -6s) infinite both");
  check("入场仍连续且单次，首次入场前隐藏",
    value('.goose-dm[data-dm-phase="in"]:not([data-dm-played]) .goose-dm-rg', "animation")
      === "goose-dm-enter 360ms var(--dm-ease-out) calc(var(--dm-i, 0) * 28ms) backwards"
      && value(".goose-dm", "--dm-ease-out") === "cubic-bezier(0.22, 1, 0.36, 1)"
      && value('.goose-dm[data-dm-phase="pre"] .goose-dm-rg', "opacity") === "0");
  check("入场序号上下界与总时长保持 600ms 内",
    entryIndex(-10) === 0 && entryIndex(1.6) === 2 && entryIndex(999) === 8
      && DOT_MOTION.entry.durationMs === 360 && DOT_MOTION.entry.staggerMs === 28
      && DOT_MOTION.entry.durationMs + DOT_MOTION.entry.maxIndex * DOT_MOTION.entry.staggerMs <= DOT_MOTION.entry.maxMs
      && DOT_MOTION.entry.maxMs === 600);

  for (const [name, expected] of Object.entries(frames)) {
    const actual = keyframes(name);
    check(`${name} 时点、幅度与属性保持不变`, JSON.stringify(actual) === JSON.stringify(expected), actual);
  }
  check("循环周期与几何幅度常量保持不变",
    JSON.stringify(DOT_MOTION.period) === JSON.stringify({ breathe: 12, ripple: 12, glint: 9, flow: 10, wave: 10, progress: 4 })
      && JSON.stringify(DOT_MOTION.amplitude) === JSON.stringify({ opacityMin: 0.9, opacityMax: 1, translatePx: 0.65, scaleMin: 1, scaleMax: 1.006 })
      && DOT_MOTION.alert.durationMs === 280 && DOT_MOTION.alert.translatePx === 0.8);
  check("错峰仍使用负 delay，不改变进行中周期",
    vars({ loop: "breathe" })["--dm-delay"] === "-12.000s"
      && vars({ loop: "ripple", delay: 2.5, period: 12 })["--dm-delay"] === "-9.500s"
      && vars({ loop: "flow", delay: -1, period: 10 })["--dm-delay"] === "-1.000s"
      && vars({ loop: "progress", delay: 1, period: 4 })["--dm-period"] === "4s"
      && vars({ loop: "alert", delay: 0.4 })["--dm-alert-delay"] === "0.400s"
      && rippleDelay(0, 8) === 0 && rippleDelay(4, 8) === 2.7);

  for (const selector of [".goose-dm[data-dm-paused]", ".goose-dm[data-dm-paused] *"]) {
    const pause = declaration(selector, "animation-play-state");
    check(`${selector} 仍强制暂停`, pause?.type === "decl" && pause.value === "paused" && pause.important);
  }
  const reduced = css.nodes.find((node): node is AtRule =>
    node.type === "atrule" && node.name === "media" && node.params === "(prefers-reduced-motion: reduce)");
  check("减少动效时根与分组均静止且入场组可见", reduced && [".goose-dm", ".goose-dm *"].every((selector) => {
    const animation = declaration(selector, "animation", reduced);
    return animation?.type === "decl" && animation.value === "none" && animation.important;
  }) && value(".goose-dm .goose-dm-rg", "opacity", reduced) === "1");
  check("悬停过渡继续使用原连续曲线",
    read("src/components/ui/dot-matrix/illustrations/glitch-art.css").includes("transition: transform 160ms var(--dm-ease, ease)"));

  const dots = grid(10, 10, 5, () => ({ r: 1, o: 0.5 }));
  check("固定点阵坐标与分组不变",
    JSON.stringify(dots) === JSON.stringify([
      { x: 2.5, y: 2.5, r: 1, o: 0.5 }, { x: 7.5, y: 2.5, r: 1, o: 0.5 },
      { x: 2.5, y: 7.5, r: 1, o: 0.5 }, { x: 7.5, y: 7.5, r: 1, o: 0.5 },
    ]) && JSON.stringify(ringBuckets(dots, { cx: 2.5, cy: 2.5, n: 2 }).map(({ index, dots: bucket }) => [index, bucket.length]))
      === JSON.stringify([[0, 1], [1, 3]]));
  const points = sample([line([0, 0], [10, 0])], 2);
  check("路径取点仍覆盖起点且沿路径递增",
    points.length === 5 && points[0]?.[0] === 0
      && points.every(([x, y], index) => y === 0 && x <= 10 && (!index || x - points[index - 1][0] >= 2)));
  let builds = 0;
  const build = () => { builds += 1; return dots; };
  check("同一组几何仍只生成一次",
    memoDots("verify-dot-motion-fixed-grid", build) === memoDots("verify-dot-motion-fixed-grid", build) && builds === 1);
  return checker.failed;
}
