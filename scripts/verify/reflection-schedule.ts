import { readFileSync } from "node:fs";
import { writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createChecker } from "./lib/check";
import { reflectionSchedule, scopeRange } from "../../src/lib/reflection/scopeRange";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");
const local = (year: number, month: number, day: number, hour = 12) =>
  new Date(year, month - 1, day, hour).getTime();

/** 定时反思的本地日历边界、缓存隔离与调度/展示接线。 */
export default async function run(): Promise<number> {
  const checker = createChecker();
  const { check } = checker;
  const hadTimezone = Object.hasOwn(process.env, "TZ");
  const previousTimezone = process.env.TZ;
  const globals = globalThis as typeof globalThis & { __rh?: unknown };
  const hadHarness = Object.hasOwn(globals, "__rh");
  const previousHarness = globals.__rh;
  process.env.TZ = "America/New_York";

  try {
  const mondayBefore = local(2026, 10, 26, 0);
  const mondayAfter = local(2026, 10, 26, 1);
  const weekBefore = reflectionSchedule("7d", mondayBefore - 1);
  const weekAfter = reflectionSchedule("7d", mondayAfter);
  check("周一零点前仍指向上周，零点后切到本周", weekBefore.dueAt === local(2026, 10, 19, 0) && weekAfter.dueAt === local(2026, 10, 26, 0), { weekBefore, weekAfter });
  const monthBefore = reflectionSchedule("30d", local(2026, 2, 28, 23));
  const monthAfter = reflectionSchedule("30d", local(2026, 3, 1, 0));
  check("月初零点前后按本地月边界切换", monthBefore.dueAt === local(2026, 2, 1, 0) && monthAfter.dueAt === local(2026, 3, 1, 0), { monthBefore, monthAfter });
  const quarterBefore = reflectionSchedule("90d", local(2026, 3, 31, 23));
  const quarterAfter = reflectionSchedule("90d", local(2026, 4, 1, 0));
  check("季度边界在 4 月 1 日零点切换", quarterBefore.dueAt === local(2026, 1, 1, 0) && quarterAfter.dueAt === local(2026, 4, 1, 0), { quarterBefore, quarterAfter });
  const yearTurn = reflectionSchedule("30d", local(2026, 1, 1, 0));
  const quarterTurn = reflectionSchedule("90d", local(2026, 1, 1, 0));
  check("跨年月／季度起点正确", yearTurn.start === local(2025, 12, 1, 0) && quarterTurn.start === local(2025, 10, 1, 0), { yearTurn, quarterTurn });
  const leap = scopeRange("30d", local(2024, 3, 15));
  check("闰年 3 月周期包含 29 天且按日历计算", leap.days === 29 && leap.start === local(2024, 2, 1, 0) && leap.end === local(2024, 3, 1, 0), leap);
  const dst = scopeRange("7d", local(2026, 3, 11));
  check("夏令时切换周保持周一至周一的 7 个日历日", dst.days === 7 && dst.end - dst.start === 167 * 60 * 60 * 1000, dst);
  const fallDst = scopeRange("7d", local(2026, 11, 4));
  check("秋季夏令时切换周保持 7 个日历日", fallDst.days === 7 && fallDst.end - fallDst.start === 169 * 60 * 60 * 1000, fallDst);

  const stableA = scopeRange("30d", local(2026, 5, 3));
  const stableB = scopeRange("30d", local(2026, 5, 31, 23));
  const next = scopeRange("30d", local(2026, 6, 1, 0));
  check("同一周期内缓存键稳定，跨周期变化", stableA.key === stableB.key && stableA.key !== next.key, { stableA: stableA.key, stableB: stableB.key, next: next.key });
  check("周期与范围互相隔离，且与旧滚动缓存键隔离", stableA.key !== scopeRange("90d", local(2026, 5, 3)).key && stableA.key.startsWith("scheduled:30d:") && stableA.key !== "30d:2026-05-31");

  const scheduler = read("src/lib/reflection/reflectionScheduler.ts");
  const store = read("src/stores/useReflection.ts");
  const hook = read("src/pages/workspace/hooks/useWeeklyReflection.ts");
  const runner = read("src/lib/reflection/reflectionRunner.ts");
  const dialog = read("src/pages/workspace/components/sidebar/reflection/ReflectionDialog.tsx");
  const tag = read("src/pages/workspace/components/sidebar/reflection/ReflectionScheduleTag.tsx");
  check("启动调度遍历周、月、季度并用各自周期键去重", scheduler.includes("REFLECTION_SCOPES") && scheduler.includes("scheduledKeys[scope] === key") && scheduler.includes("markScheduled(scope, key)"));
  check("已调度周期键进入持久化状态", store.includes("scheduledKeys: s.scheduledKeys") && store.includes("scheduledKeys: p.scheduledKeys ?? {}"));
  check("生成入口启动后定时检查并在窗口聚焦时补跑", hook.includes("runScheduledReflections()") && hook.includes("setInterval(check, CHECK_INTERVAL_MS)") && hook.includes('addEventListener("focus", check)'));
  check("生成器把范围键用于缓存和报告落盘", runner.includes("const key = scopeRange(scope).key") && runner.includes("saveReport(range.key"));
  check("反思弹窗展示当前范围的生成状态标签", dialog.includes("ReflectionScheduleTag scope={scope} enabled={aiConsent && aiReady}") && tag.includes("reflectionSchedule(scope, now)") && tag.includes('uiText("paused")'));

  const temp = await mkdtemp(path.join(tmpdir(), "reflection-schedule-"));
  try {
    const outfile = path.join(temp, "scheduler.mjs");
    const buildScriptPath = path.join(temp, "build-scheduler.cjs");
    writeFileSync(buildScriptPath, String.raw`const path=require('node:path'); const {createRequire}=require('node:module'); const root=process.argv[2]; const requireRoot=createRequire(path.join(root,'package.json')); const {build}=requireRoot('esbuild'); const outfile=process.argv[3]; build({entryPoints:[path.join(root,'src/lib/reflection/reflectionScheduler.ts')],outfile,bundle:true,platform:'node',format:'esm',logLevel:'silent',plugins:[{
        name: "reflection-runtime-stubs",
        setup(api) {
          api.onResolve({ filter: /^@\/stores\/useSettings$/ }, () => ({ path: "settings", namespace: "reflection-stub" }));
          api.onResolve({ filter: /^@\/stores\/useReflection$/ }, () => ({ path: "reflection", namespace: "reflection-stub" }));
          api.onResolve({ filter: /^\.\/reflectionRunner$/ }, () => ({ path: "runner", namespace: "reflection-stub" }));
          api.onLoad({ filter: /.*/, namespace: "reflection-stub" }, ({ path: id }) => ({
            loader: "js",
            contents: id === "settings"
              ? "export const useSettings = { getState: () => globalThis.__rh.settings };"
              : id === "reflection"
                ? "export const useReflection = { persist: { hasHydrated: () => globalThis.__rh.hydrated }, getState: () => globalThis.__rh.state }; export const isReflectionAiConsented = (s, enabled) => s.aiConsent && s.aiConsentChosen && enabled;"
                : "export const isReflectionAIReady = () => globalThis.__rh.ready; export async function loadReflectionData(scope) { globalThis.__rh.loaded.push(scope); return { range: globalThis.__rh.range(scope), stats: { total: globalThis.__rh.empty ? 0 : 1 } }; } export async function ensureReflection(scope) { globalThis.__rh.generated.push(scope); if (globalThis.__rh.failScope === scope) { globalThis.__rh.state.failure = { key: globalThis.__rh.range(scope).key }; return false; } return true; }",
          }));
        },
      }] }).catch((error)=>{console.error(error);process.exit(1)});`);
    execFileSync(process.execPath, [buildScriptPath, root, outfile], { stdio: "pipe" });
    const mod = await import(pathToFileURL(outfile).href);
    const currentKeys = Object.fromEntries(["7d", "30d", "90d"].map((scope) => [scope, scopeRange(scope as "7d" | "30d" | "90d").key]));
    const state = () => ({ aiConsent: true, aiConsentChosen: true, generatingKey: null as string | null, scheduledKeys: {} as Record<string, string>, reports: {} as Record<string, unknown>, failure: null as { key: string } | null, markScheduled(scope: string, key: string) { this.scheduledKeys[scope] = key; } });
    const harness = (overrides: Record<string, unknown> = {}) => Object.assign({
      hydrated: true, ready: true, empty: false, failScope: "", settings: { ai: { enabled: true } },
      loaded: [] as string[], generated: [] as string[], state: state(), range: (scope: string) => ({ key: currentKeys[scope] }),
    }, overrides);
    const global = globals as typeof globalThis & { __rh: ReturnType<typeof harness> };
    global.__rh = harness({ hydrated: false });
    await mod.runScheduledReflections();
    check("未水合时不读数据、不生成", global.__rh.loaded.length === 0 && global.__rh.generated.length === 0);
    global.__rh = harness({ state: Object.assign(state(), { aiConsent: false }) });
    await mod.runScheduledReflections();
    check("未授权时不读数据、不生成", global.__rh.loaded.length === 0 && global.__rh.generated.length === 0);
    global.__rh = harness({ ready: false });
    await mod.runScheduledReflections();
    check("AI 不可用时不读数据、不生成", global.__rh.loaded.length === 0 && global.__rh.generated.length === 0);
    global.__rh = harness();
    await mod.runScheduledReflections();
    check("三个周期顺序读取、顺序生成并持久化检查键", global.__rh.generated.join(",") === "7d,30d,90d" && Object.keys(global.__rh.state.scheduledKeys).join(",") === "7d,30d,90d", { generated: global.__rh.generated, scheduled: global.__rh.state.scheduledKeys });
    global.__rh = harness({ empty: true });
    await mod.runScheduledReflections();
    check("无编辑周期只记录检查键，不请求生成", global.__rh.generated.length === 0 && Object.keys(global.__rh.state.scheduledKeys).length === 3);
    global.__rh = harness({ failScope: "30d" });
    await mod.runScheduledReflections();
    check("生成失败的周期也落检查键，避免重复调用", global.__rh.generated.join(",") === "7d,30d,90d" && global.__rh.state.scheduledKeys["30d"] === currentKeys["30d"]);
    const failedCounts = global.__rh.generated.length;
    await mod.runScheduledReflections();
    check("失败周期后续检查不重复读取或生成", global.__rh.generated.length === failedCounts && global.__rh.loaded.length === 3);
    global.__rh = harness({ state: Object.assign(state(), { scheduledKeys: { "7d": currentKeys["7d"] }, reports: { [currentKeys["30d"]]: {} } }) });
    await mod.runScheduledReflections();
    check("已检查周期跳过，已有报告只补检查标记", global.__rh.loaded.join(",") === "90d" && global.__rh.generated.join(",") === "90d" && global.__rh.state.scheduledKeys["30d"] === currentKeys["30d"]);
    global.__rh = harness({ state: Object.assign(state(), { generatingKey: "external" }) });
    await mod.runScheduledReflections();
    check("已有生成任务时不抢锁、不重复生成", global.__rh.loaded.length === 0 && global.__rh.generated.length === 0);
    global.__rh = harness({ range: (scope: string) => ({ key: `${currentKeys[scope]}:newer` }) });
    await mod.runScheduledReflections();
    check("加载期间周期键变化时不生成且不标记旧周期", global.__rh.generated.length === 0 && Object.keys(global.__rh.state.scheduledKeys).length === 0);
    global.__rh = harness();
    await Promise.all([mod.runScheduledReflections(), mod.runScheduledReflections()]);
    check("并发调度调用共用运行锁，只生成一次", global.__rh.generated.join(",") === "7d,30d,90d");
  } finally {
    await rm(temp, { recursive: true, force: true });
  }

  return checker.failed;
  } finally {
    if (hadTimezone) process.env.TZ = previousTimezone;
    else delete process.env.TZ;
    if (hadHarness) globals.__rh = previousHarness;
    else delete globals.__rh;
  }
}
