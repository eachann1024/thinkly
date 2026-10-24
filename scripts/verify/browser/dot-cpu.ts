import { readFile, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { tmpdir } from "node:os";
import { createChecker } from "../lib/check";
import { loopOffsets } from "../../../src/components/ui/dot-matrix/loopClock";

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const nonnegative = (value: unknown): value is number => finite(value) && value >= 0;
const list = (value: unknown): any[] => Array.isArray(value) ? value : [];
const isDotLoop = (item: any) => typeof item?.name === "string" && item.name.startsWith("goose-dm-")
  && !["goose-dm-enter", "goose-dm-shake"].includes(item.name);
const characterLoops = new Set(["goose-cs-float-lg", "goose-cs-float-sm", "goose-cs-blink", "goose-cs-blink-open", "goose-cs-blink-twice", "goose-cs-blink-twice-open"]);
const isCharacterLoop = (item: any) => characterLoops.has(item?.name);
const isLoop = (item: any) => isDotLoop(item) || isCharacterLoop(item);
const loops = (state: any) => list(state?.renderer?.animationTimes).filter(isLoop);
const normalizeEasing = (value: unknown) => typeof value === "string"
  ? value.replace(/\s/g, "").replace(/steps\((\d+),end\)/g, "steps($1)").replace("step-end", "steps(1)") : "";
const states = (phase: any): any[] => [phase.before, ...list(phase.samples), phase.after];
const visualStates = (phase: any): any[] => [...states(phase), ...list(phase.visualSamples)];
const maxGap = (item: any) => {
  const offsets = loopOffsets(item.name);
  return Math.max(...offsets.slice(1).map((value, index) => value - offsets[index])) * item.duration;
};

function inventory(state: any) {
  return JSON.stringify(list(state?.renderer?.animationTimes).map((item) => ({
    id: item.id, targetId: item.targetId, name: item.name,
    duration: item.duration, delay: item.delay, iterations: item.iterations,
  })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
}

async function artifact(entry: string) {
  const hash = createHash("sha256");
  let files = 0;
  const visit = async (directory: string) => {
    const entries = (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
    for (const item of entries) {
      const filename = path.join(directory, item.name);
      if (item.isDirectory()) await visit(filename);
      else if (item.isFile()) {
        files++;
        hash.update(path.relative(path.dirname(entry), filename));
        hash.update("\0");
        hash.update(await readFile(filename));
      }
    }
  };
  await visit(path.dirname(entry));
  return { entry, htmlHash: createHash("sha256").update(await readFile(entry)).digest("hex"), treeHash: hash.digest("hex"), files };
}

function validSnapshot(state: any, variant: string) {
  const renderer = state?.renderer;
  const animations = list(renderer?.animationTimes);
  const dots = list(renderer?.dots);
  const expectedState = (item: any) => variant === "after" && isLoop(item) ? "paused" : "running";
  const counts = Object.fromEntries(["running", "paused"].map((state) => [state, animations.filter((item) => item.state === state).length]));
  return state?.nativeVisible === false && state.backgroundThrottling === true
    && renderer?.visibility === "visible" && renderer.hidden === false && finite(renderer.now)
    && renderer.randomFixture === "LCG32:0x54686e6b"
    && animations.length > 0 && animations.length === renderer.animations
    && ["running", "paused"].every((state) => (renderer.animationStates?.[state] ?? 0) === counts[state])
    && new Set(animations.map((item) => item.id)).size === animations.length
    && animations.every((item) => typeof item.id === "number" && typeof item.targetId === "number"
      && item.state === expectedState(item) && item.playbackRate === 1 && finite(item.time)
      && finite(item.duration) && item.duration > 0 && finite(item.delay) && item.iterations === "infinite"
      && (!isCharacterLoop(item) || (item.name.startsWith("goose-cs-float")
        ? item.duration === 8000 && item.delay >= -8000 && item.delay <= 0
        : item.duration >= 6000 && item.duration <= 9000 && item.delay >= -6000 && item.delay <= 0))
      && typeof item.visual?.opacity === "string" && Number.isFinite(Number(item.visual.opacity))
      && typeof item.visual?.transform === "string")
    && dots.length > 0 && new Set(dots.map((dot) => dot.id)).size === dots.length
    && dots.every((dot) => typeof dot.id === "number" && dot.phase === "in" && !dot.paused
      && dot.display !== "none" && Number.isFinite(Number(dot.opacity)) && Number(dot.opacity) > 0
      && finite(dot.width) && dot.width > 0 && finite(dot.height) && dot.height > 0 && dot.inViewport === true
      && ["dot", "character"].includes(dot.kind) && (variant !== "after" || dot.clock === "boundary"))
    && dots.some((dot) => dot.kind === "dot")
    && list(renderer.visibilityEvents).every((event) => event?.state === "visible");
}

function clocksAdvance(phase: any) {
  const snapshots = states(phase);
  const elapsed = phase.after?.renderer?.now - phase.before?.renderer?.now;
  if (!finite(elapsed) || elapsed < 32_000
    || Math.abs(elapsed - phase.elapsedSeconds * 1000) > 2000 || list(phase.samples).length !== 4) return false;
  return snapshots.slice(1).every((snapshot, index) => {
    const prior = snapshots[index];
    const delta = snapshot?.renderer?.now - prior?.renderer?.now;
    const after = new Map(list(snapshot?.renderer?.animationTimes).map((item) => [item.id, item]));
    return finite(delta) && delta >= 3000 && delta <= 9000
      && inventory(snapshot) === inventory(prior)
      && list(prior?.renderer?.animationTimes).every((item) => {
        const next = after.get(item.id);
        const tolerance = phase.variant === "after" && isLoop(item) ? maxGap(item) + 150 : Math.max(100, delta * 0.01);
        return next && next.time >= item.time && Math.abs((next.time - item.time) - delta) <= tolerance;
      });
  }) && snapshots.slice(1).every((snapshot, index) => {
    const delta = snapshot.renderer.now - snapshots[0].renderer.now;
    return list(phase.before?.renderer?.animationTimes).every((item) => {
      const next = list(snapshot.renderer.animationTimes).find((next) => next.id === item.id);
      const tolerance = phase.variant === "after" && isLoop(item) ? maxGap(item) + 150 : Math.max(100, delta * 0.01);
      return next && next.time >= item.time && (index !== snapshots.length - 2 || next.time > item.time)
        && Math.abs((next.time - item.time) - delta) <= tolerance;
    });
  });
}

function visualsChange(phase: any) {
  const snapshots = visualStates(phase);
  return loops(phase.before).length > 0 && loops(phase.before).filter((item) => !item.name.startsWith("goose-cs-blink")).every((item) => {
    const values = snapshots.map((state) => list(state?.renderer?.animationTimes).find((next) => next.id === item.id));
    return values.every(Boolean) && new Set(values.map((next) => JSON.stringify(next.visual))).size > 1;
  });
}

function visualSamplesContinue(phase: any) {
  const samples = list(phase.visualSamples);
  const animated = loops(phase.after).filter((item) => !item.name.startsWith("goose-cs-blink"));
  const elapsed = samples.at(-1)?.renderer?.now - phase.after?.renderer?.now;
  if (samples.length !== 4 || phase.visualSampleIntervalMs !== 1100 || phase.visualSamplesExcludedFromCpu !== true
    || !animated.length || !finite(elapsed) || elapsed <= Math.max(...animated.map(maxGap))) return false;
  return samples.every((snapshot, index) => {
    const prior = index ? samples[index - 1] : phase.after;
    const delta = snapshot?.renderer?.now - prior?.renderer?.now;
    const after = new Map(list(snapshot?.renderer?.animationTimes).map((item) => [item.id, item]));
    return finite(delta) && delta >= 900 && delta <= 1800 && inventory(snapshot) === inventory(prior)
      && [prior, phase.after, phase.before].every((origin) => {
        const elapsed = snapshot?.renderer?.now - origin?.renderer?.now;
        return finite(elapsed) && elapsed > 0 && list(origin?.renderer?.animationTimes).every((item) => {
          const next = after.get(item.id);
          const tolerance = phase.variant === "after" && isLoop(item) ? maxGap(item) + 150 : Math.max(100, elapsed * 0.01);
          return next && next.time >= item.time && Math.abs((next.time - item.time) - elapsed) <= tolerance;
        });
      });
  });
}

export default async function run() {
  const checker = createChecker();
  const filename = process.env.THINKLY_DOT_CPU_REPORT ?? path.join(tmpdir(), "thinkly-dot-cpu.json");
  const text = await readFile(filename, "utf8").catch(() => "");
  checker.check("存在本轮 Electron CPU 诊断结果", Boolean(text));
  if (!text) return checker.failed;
  let report: any;
  try { report = JSON.parse(text); } catch { checker.check("诊断结果为有效 JSON", false); return checker.failed; }
  const css = await readFile(path.join(process.cwd(), "src/components/ui/dot-matrix/dot-matrix.css"), "utf8");
  const hash = createHash("sha256").update(css).digest("hex");
  const marker = "--dm-loop-ease: steps(2, end)";
  const beforeCSS = css.replace(marker, "--dm-loop-ease: var(--dm-ease)");
  const beforeHash = createHash("sha256").update(beforeCSS).digest("hex");
  const age = Date.now() - (await stat(filename)).mtimeMs;
  const finishedAge = Date.now() - Date.parse(report.finishedAt);
  checker.check("诊断对应当前 CSS、真实连续基线且在十分钟内完成", css.split(marker).length === 2
    && report.cssHashes?.after === hash && report.cssHashes?.before === beforeHash && hash !== beforeHash
    && age >= 0 && age < 600_000 && finishedAge >= 0 && finishedAge < 600_000 && Boolean(report.runId));
  checker.check("使用隔离真实 Electron，未载入业务主进程或用户数据", Boolean(report.electron)
    && report.constraints?.includes("no application main/preload")
    && report.constraints?.includes("fresh temporary profile")
    && report.constraints?.includes("external network blocked"));
  checker.check("每个隔离文档在应用执行前复用相同随机输入", report.fixtureRandom?.algorithm === "LCG32"
    && report.fixtureRandom?.seed === "0x54686e6b"
    && report.fixtureRandom?.reset === "each isolated renderer document before application scripts");
  const currentEntry = path.join(process.cwd(), "dist-electron/renderer/index.html");
  const currentArtifact = await artifact(currentEntry).catch(() => null);
  const artifacts = report.rendererArtifacts;
  checker.check("实际加载旧/新两个不同 JS 产物，改后产物与当前构建逐字节一致", report.diagnostic === "hidden-renderer-bundle-crossover"
    && artifacts?.before?.entry !== artifacts?.after?.entry && artifacts?.before?.treeHash !== artifacts?.after?.treeHash
    && JSON.stringify(artifacts?.after) === JSON.stringify(currentArtifact)
    && typeof artifacts?.before?.treeHash === "string" && artifacts.before.treeHash.length === 64);
  const phases: any[] = Array.isArray(report.phases) ? report.phases : [];
  const validPhases = phases.length === 4
    && phases.map((phase) => phase.variant).join() === "before,after,before,after"
    && phases.every((phase) => nonnegative(phase.elapsedSeconds) && phase.elapsedSeconds >= 32
      && phase.schedulerProbe === false && phase.pauseGroup === "none" && phase.promotion === false
      && JSON.stringify(phase.rendererArtifact) === JSON.stringify(artifacts?.[phase.variant]));
  checker.check("按改前/改后交叉四轮，各至少32秒且无渲染错误", validPhases
    && Array.isArray(report.errors) && report.errors.length === 0);
  for (const type of ["GPU", "Tab"]) {
    const rates = ["before", "after"].map((variant) => {
      const selected = phases.filter((phase) => phase.variant === variant);
      const values = selected.map((phase) => {
        const readings = list(phase.cpu).filter((metric: any) => metric.type === type);
        return readings?.length === 1 ? readings[0].cpuSeconds : null;
      });
      return validPhases && selected.length === 2 && values.every(nonnegative)
        ? values.reduce((sum, value) => sum + value, 0) / selected.reduce((sum, phase) => sum + phase.elapsedSeconds, 0) * 100
        : NaN;
    });
    const ratio = rates[1] / rates[0];
    checker.check(`${type} CPU 有实际基准负载并降至原来的10%以内`, nonnegative(ratio)
      && rates[0] > (type === "GPU" ? 20 : 5) && ratio <= 0.1,
    { before: rates[0], after: rates[1], ratio });
  }
  const snapshots = phases.flatMap(visualStates);
  checker.check("各轮全部采样文档可见、插画在视口，改后无限循环由边界时钟接管", validPhases
    && phases.every((phase) => visualStates(phase).every((state) => validSnapshot(state, phase.variant))));
  checker.check("全部动画在每段采样及整轮按实际时长推进，无冻结或重置", validPhases && phases.every(clocksAdvance));
  checker.check("CPU窗口外另有四次连续视觉采样，覆盖最长持帧且全部时钟保持推进", validPhases && phases.every(visualSamplesContinue));
  checker.check("每条点阵及角色浮动的实际 opacity/transform 在采样中变化", validPhases && phases.every(visualsChange));
  const baseline = phases[0]?.before;
  const geometry = JSON.stringify(baseline?.renderer?.geometry);
  const dots = JSON.stringify(list(baseline?.renderer?.dots).map((dot) => dot.id).sort((a, b) => a - b));
  checker.check("四轮消费者、全部动画与稳定几何一致且无布局重排", validPhases
    && baseline?.renderer?.geometry && snapshots.every((state) => inventory(state) === inventory(baseline)
      && JSON.stringify(state?.renderer?.geometry) === geometry
      && JSON.stringify(list(state?.renderer?.dots).map((dot) => dot.id).sort((a, b) => a - b)) === dots)
    && phases.every((phase) => phase.perfDelta?.LayoutCount === 0));
  checker.check("全部点阵与角色循环使用各自对应的真实对照曲线", validPhases && phases.every((phase) => {
    return visualStates(phase).every((state) => loops(state).length > 0
      && loops(state).every((item) => normalizeEasing(item.easing) === (isCharacterLoop(item) ? "steps(1)"
        : phase.variant === "before" ? "cubic-bezier(0.45,0,0.55,1)" : "steps(2)")));
  }));
  return checker.failed;
}
