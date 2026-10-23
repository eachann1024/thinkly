import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createChecker } from "./lib/check";
import { parseSearchAISettings, searchAISettingsRank, shouldApplySearchAISettings, shouldPublishWorkspaceAI } from "../../src/lib/electron/searchAISettings";
import { searchAiEmptyChrome } from "../../src/pages/workspace/components/search-sheet/searchAiChrome";
import {
  centeredSearchWindowBounds,
  parseOpenSearchResultPayload,
  parseSearchWindowCommand,
  resolveSearchHotkeySurface,
  resolveSearchResultPageId,
  searchCommandRaisesMainWindow,
  SEARCH_WINDOW_HEIGHT,
  SEARCH_WINDOW_WIDTH,
  type SearchHotkeySource,
  type SearchHotkeySurface,
  type SearchWindowCommand,
} from "../../src/lib/electron/searchWindow";
import { gooseWindowAdditionalArguments, parseGooseWindowArgs } from "../../src/lib/electron/windowContext";
import { correctWorkspaceAfterFloatingRaise, fillWorkspaceFloatingPlans, planWorkspaceAfterFloatingRaise } from "../../src/lib/electron/windowToggle";

/** 浮动搜索窗：热键去向、居中位置、窗口种类参数与打开结果载荷。 */
export default async function run(): Promise<number> {
  const checker = createChecker();
  const { check } = checker;

  console.log("· 热键去向");
  const cases: Array<[string, { fromWindowInput: boolean; sourceKind: SearchHotkeySource; workspaceFocused: boolean; searchVisible: boolean }, SearchHotkeySurface]> = [
    ["聚焦主窗内按键 → 应用内面板", { fromWindowInput: true, sourceKind: "workspace", workspaceFocused: true, searchVisible: false }, "in-app"],
    ["系统热键且主窗聚焦 → 应用内面板", { fromWindowInput: false, sourceKind: "workspace", workspaceFocused: true, searchVisible: false }, "in-app"],
    ["系统热键且应用不在前台 → 浮动窗", { fromWindowInput: false, sourceKind: "workspace", workspaceFocused: false, searchVisible: false }, "show-floating"],
    ["速记聚焦时按键 → 浮动窗", { fromWindowInput: true, sourceKind: "quicknote", workspaceFocused: false, searchVisible: false }, "show-floating"],
    ["速记聚焦时系统热键 → 浮动窗", { fromWindowInput: false, sourceKind: "quicknote", workspaceFocused: false, searchVisible: false }, "show-floating"],
    ["浮动窗可见时系统热键 → 收起", { fromWindowInput: false, sourceKind: "workspace", workspaceFocused: false, searchVisible: true }, "hide-floating"],
    ["浮动窗内按键 → 收起", { fromWindowInput: true, sourceKind: "search", workspaceFocused: false, searchVisible: true }, "hide-floating"],
    ["浮动窗可见、主窗聚焦也先收起", { fromWindowInput: false, sourceKind: "workspace", workspaceFocused: true, searchVisible: true }, "hide-floating"],
  ];
  for (const [label, state, expected] of cases) {
    const actual = resolveSearchHotkeySurface(state);
    check(label, actual === expected, { expected, actual });
  }

  console.log("· 居中位置");
  const primary = centeredSearchWindowBounds({ x: 0, y: 25, width: 1440, height: 875 });
  check("主屏水平居中、偏上三分之一", primary.x === 380 && primary.y === 25 + 138 && primary.width === SEARCH_WINDOW_WIDTH && primary.height === SEARCH_WINDOW_HEIGHT, primary);
  const right = centeredSearchWindowBounds({ x: 1440, y: 0, width: 1920, height: 1080 });
  check("右侧副屏用该屏工作区坐标", right.x === 1440 + 620 && right.y === 207, right);
  const negative = centeredSearchWindowBounds({ x: -1920, y: -200, width: 1920, height: 1040 });
  check("左上方负坐标副屏保持在屏内", negative.x === -1920 + 620 && negative.y === -200 + 193 && negative.x + negative.width <= 0, negative);
  const small = centeredSearchWindowBounds({ x: 100, y: 50, width: 600, height: 400 });
  check("窗口大于工作区时收缩并贴齐工作区", small.width === 600 && small.height === 400 && small.x === 100 && small.y === 50, small);
  const odd = centeredSearchWindowBounds({ x: 0, y: 0, width: 1367, height: 769 }, { width: 680.4, height: 460 });
  check("奇数尺寸取整", [odd.x, odd.y, odd.width, odd.height].every(Number.isInteger), odd);

  console.log("· 窗口种类参数");
  const searchArgs = parseGooseWindowArgs(gooseWindowAdditionalArguments("w-1", "search"));
  check("search 种类可往返解析", searchArgs?.kind === "search" && searchArgs.windowId === "w-1", searchArgs);
  check("quicknote 仍可解析", parseGooseWindowArgs(["--goose-window-id=q", "--goose-window-kind=quicknote"])?.kind === "quicknote");
  check("未知种类拒绝", parseGooseWindowArgs(["--goose-window-id=x", "--goose-window-kind=panel"]) === null);
  check("缺少 id 拒绝", parseGooseWindowArgs(["--goose-window-kind=search"]) === null);

  console.log("· 打开结果载荷");
  const ok = parseOpenSearchResultPayload({ pageId: " local-nb-a.md ", query: "周报", localFilePath: "/notes/a.md" });
  check("合法载荷保留 id、查询词与路径", ok?.pageId === "local-nb-a.md" && ok.query === "周报" && ok.localFilePath === "/notes/a.md", ok);
  check("缺少查询词视为空串", parseOpenSearchResultPayload({ pageId: "p" })?.query === "");
  check("空 id 拒绝", parseOpenSearchResultPayload({ pageId: "  " }) === null);
  check("非对象拒绝", [null, "p", 1, ["p"]].every(value => parseOpenSearchResultPayload(value) === null));
  check("查询词类型错误拒绝", parseOpenSearchResultPayload({ pageId: "p", query: 3 }) === null);
  check("过长查询词截断", parseOpenSearchResultPayload({ pageId: "p", query: "x".repeat(5000) })?.query.length === 1000);
  check("非字符串路径忽略", parseOpenSearchResultPayload({ pageId: "p", localFilePath: 7 })?.localFilePath === undefined);

  console.log("· 主窗定位结果页");
  const pages = {
    "local-nb-a.md": { id: "local-nb-a.md", localFilePath: "/notes/a.md" },
    "local-nb-b.md~2": { id: "local-nb-b.md~2", localFilePath: "/notes/b.md" },
    "local-nb-dir": { id: "local-nb-dir", localFilePath: "/notes/b.md", isFolder: true },
  };
  check("按 id 命中", resolveSearchResultPageId(pages, { pageId: "local-nb-a.md", query: "" }) === "local-nb-a.md");
  check("id 不一致时按文件路径回退", resolveSearchResultPageId(pages, { pageId: "local-nb-b.md", query: "", localFilePath: "/notes/b.md" }) === "local-nb-b.md~2");
  check("尚未加载时返回空", resolveSearchResultPageId(pages, { pageId: "missing", query: "", localFilePath: "/notes/c.md" }) === null);

  console.log("· 主窗动作");
  const continued = parseSearchWindowCommand({
    type: "continue-ai",
    token: " t1 ",
    notebookId: " nb ",
    question: " 周报里写了什么 ",
    text: "写了进度。",
    sources: [{ id: "p1", title: "周报", index: 1 }, { id: "p2", title: "附录", index: null }],
  });
  check("续聊保留记号、笔记本、问题、正文与来源", continued?.type === "continue-ai" && continued.token === "t1" && continued.notebookId === "nb" && continued.question === " 周报里写了什么 " && continued.text === "写了进度。" && continued.sources.length === 2 && continued.sources[1].index === null, continued);
  check("回答完成可静默归档", parseSearchWindowCommand({ type: "archive-ai", token: "t1", notebookId: "nb", question: "q", text: "a", sources: [] })?.type === "archive-ai");
  check("过长问题截断", parseSearchWindowCommand({ type: "continue-ai", token: "t", notebookId: "nb", question: "q".repeat(5000), text: "", sources: [] })?.type === "continue-ai" && (parseSearchWindowCommand({ type: "continue-ai", token: "t", notebookId: "nb", question: "q".repeat(5000), text: "", sources: [] }) as { question: string }).question.length === 4000);
  check("空问题拒绝", parseSearchWindowCommand({ type: "continue-ai", token: "t", notebookId: "nb", question: "  ", text: "", sources: [] }) === null);
  check("缺少记号拒绝", parseSearchWindowCommand({ type: "archive-ai", notebookId: "nb", question: "q", text: "a", sources: [] }) === null);
  check("流式续问只保留问题", parseSearchWindowCommand({ type: "ask-ai", notebookId: " nb ", question: "周报" })?.type === "ask-ai");
  check("斜杠指令交给主窗", parseSearchWindowCommand({ type: "ai-slash", id: "new" })?.type === "ai-slash" && parseSearchWindowCommand({ type: "ai-slash", id: "compact" })?.type === "ai-slash");
  check("未知斜杠指令拒绝", parseSearchWindowCommand({ type: "ai-slash", id: "rename" }) === null);
  check("坏来源拒绝", parseSearchWindowCommand({ type: "continue-ai", notebookId: "nb", question: "q", text: "", sources: [{ id: "", title: "周报", index: 1 }] }) === null);
  check("打开 AI 设置", parseSearchWindowCommand({ type: "open-settings", tab: "ai" })?.type === "open-settings");
  check("其他设置页拒绝", parseSearchWindowCommand({ type: "open-settings", tab: "general" }) === null);
  check("隐藏最近", parseSearchWindowCommand({ type: "hide-recent" })?.type === "hide-recent");
  check("分屏动作", parseSearchWindowCommand({ type: "split", action: "split-right" })?.type === "split");
  check("未知分屏拒绝", parseSearchWindowCommand({ type: "split", action: "equalize" }) === null);
  check("未知命令拒绝", [null, "continue-ai", { type: "ask" }].every((value) => parseSearchWindowCommand(value) === null));
  const beside = parseSearchWindowCommand({ type: "open-beside", pageId: " page ", placement: "right", query: "周报", localFilePath: "/notes/a.md" });
  check("向右分屏保留笔记与路径", beside?.type === "open-beside" && beside.pageId === "page" && beside.placement === "right" && beside.query === "周报" && beside.localFilePath === "/notes/a.md");
  check("四个方向都能分屏", ["left", "right", "top", "bottom"].every((placement) => parseSearchWindowCommand({ type: "open-beside", pageId: "page", placement })?.type === "open-beside"));
  check("中央替换不是分屏方向", parseSearchWindowCommand({ type: "open-beside", pageId: "page", placement: "center" }) === null);
  check("空笔记拒绝分屏", parseSearchWindowCommand({ type: "open-beside", pageId: "  ", placement: "bottom" }) === null);

  console.log("· 主窗 AI 设置快照");
  const ready = parseSearchAISettings({
    enabled: true,
    selectedModelId: "deepseek-flash",
    customProviderId: "deepseek",
    customProtocol: "openai-responses",
    customOpenAIResponsesApiKey: "sk-live",
    customModelOptions: [{ id: "deepseek-flash", label: "deepseek-flash" }],
  });
  const off = parseSearchAISettings({ enabled: false });
  const enabledOnly = parseSearchAISettings({ enabled: true });
  check("已配置的快照可解析", ready?.enabled === true && ready.selectedModelId === "deepseek-flash" && ready.customOpenAIResponsesApiKey === "sk-live" && ready.customModelOptions.length === 1, ready);
  check("已配置快照比未开启更高", ready !== null && off !== null && searchAISettingsRank(ready) > searchAISettingsRank(off));
  check("只开了开关但没有密钥低于可用", ready !== null && enabledOnly !== null && searchAISettingsRank(enabledOnly) < searchAISettingsRank(ready));
  check("坏快照拒绝", [null, "ai", { customProviderId: "deepseek" }, []].every((value) => parseSearchAISettings(value) === null));
  check("未标明已恢复的快照不当作用户选择", ready?.hydrated === false && off?.hydrated === false);

  const localReady = parseSearchAISettings({
    enabled: true,
    hydrated: true,
    selectedModelId: "deepseek-flash",
    customOpenAIResponsesApiKey: "sk-live",
    customModelOptions: [{ id: "deepseek-flash", label: "deepseek-flash" }],
  });
  const turnedOff = parseSearchAISettings({ enabled: false, hydrated: true });
  const notHydrated = parseSearchAISettings({ enabled: false, hydrated: false });
  check("主窗关掉 AI 后覆盖搜索窗旧配置", localReady !== null && turnedOff !== null && shouldApplySearchAISettings(localReady, turnedOff));
  check("主窗尚未恢复时不覆盖本地可用配置", localReady !== null && notHydrated !== null && !shouldApplySearchAISettings(localReady, notHydrated));
  check("相同快照不重复写入", localReady !== null && !shouldApplySearchAISettings(localReady, localReady));
  const partial = parseSearchAISettings({ enabled: true, hydrated: true, customOpenAIResponsesApiKey: "sk-live" });
  check("更不完整的缓存不降级本地", localReady !== null && partial !== null && searchAISettingsRank(partial) < searchAISettingsRank(localReady) && !shouldApplySearchAISettings(localReady, partial));
  const memoryOn = parseSearchAISettings({ enabled: true, hydrated: true, selectedModelId: "deepseek-flash", customOpenAIResponsesApiKey: "sk-live", customModelOptions: [{ id: "deepseek-flash", label: "deepseek-flash" }] });
  const diskOff = parseSearchAISettings({ enabled: false });
  check("内存比磁盘更完整时仍发布", memoryOn !== null && diskOff !== null && shouldPublishWorkspaceAI(memoryOn, diskOff));
  check("旧内存不覆盖磁盘里更完整的配置", memoryOn !== null && diskOff !== null && !shouldPublishWorkspaceAI(turnedOff, memoryOn));
  check("尚未恢复不发布", memoryOn !== null && !shouldPublishWorkspaceAI(notHydrated, null));
  check("没有磁盘记录时发布内存", memoryOn !== null && shouldPublishWorkspaceAI(memoryOn, null));

  const invalidModels = Array.from({ length: 1_000_000 }, () => ({ id: "", label: "" }));
  const scanStarted = performance.now();
  const scanned = parseSearchAISettings({ enabled: true, customModelOptions: invalidModels });
  const scanMs = performance.now() - scanStarted;
  check("百万条无效模型解析不超过 50ms", scanMs <= 50 && scanned?.customModelOptions.length === 0, scanMs);

  const validModels = Array.from({ length: 1_000_000 }, (_, index) => ({ id: `m${index}`, label: `m${index}` }));
  const capStarted = performance.now();
  const capped = parseSearchAISettings({ enabled: true, customModelOptions: validModels });
  const capMs = performance.now() - capStarted;
  check("百万条有效模型只保留前 200 且不超过 50ms", capMs <= 50 && capped?.customModelOptions.length === 200 && capped.customModelOptions[0]?.id === "m0", capMs);

  const chromeOff = searchAiEmptyChrome({ enabled: false, ready: false });
  const chromeIncomplete = searchAiEmptyChrome({ enabled: true, ready: false });
  const chromeReady = searchAiEmptyChrome({ enabled: true, ready: true });
  check("开关关闭时给出启用问答", chromeOff.showEnable && !chromeOff.showAsk);
  check("开关已开但还不能问答时不再提示启用", !chromeIncomplete.showEnable && !chromeIncomplete.showAsk);
  check("配置齐了只显示询问行", !chromeReady.showEnable && chromeReady.showAsk);

  console.log("· 小窗不改主窗可见性");
  const plans = [
    [{ visible: true, minimized: false }, "keep-visible"],
    [{ visible: false, minimized: false }, "keep-hidden"],
    [{ visible: false, minimized: true }, "leave"],
    [{ visible: true, minimized: true }, "leave"],
  ] as const;
  for (const [state, expected] of plans) {
    check(`规划 ${expected}`, planWorkspaceAfterFloatingRaise(state) === expected, state);
  }
  const visibleBits = new Uint8Array([1, 0, 0, 1]);
  const minimizedBits = new Uint8Array([0, 0, 1, 1]);
  const planBits = new Uint8Array(4);
  fillWorkspaceFloatingPlans(visibleBits, minimizedBits, planBits);
  check("批量规划与单窗一致", planBits[0] === 1 && planBits[1] === 2 && planBits[2] === 0 && planBits[3] === 0);
  check("可见窗被收起后拉回", correctWorkspaceAfterFloatingRaise("keep-visible", false) === "show");
  check("可见窗仍可见则不动", correctWorkspaceAfterFloatingRaise("keep-visible", true) === "leave");
  check("隐藏窗被带出后重新隐藏", correctWorkspaceAfterFloatingRaise("keep-hidden", true) === "hide");
  check("隐藏窗保持隐藏则不动", correctWorkspaceAfterFloatingRaise("keep-hidden", false) === "leave");
  check("最小化窗口不纠正", correctWorkspaceAfterFloatingRaise("leave", true) === "leave" && correctWorkspaceAfterFloatingRaise("leave", false) === "leave");

  const windowCount = 1_000_000;
  const visibleWindows = new Uint8Array(windowCount);
  const minimizedWindows = new Uint8Array(windowCount);
  const plannedWindows = new Uint8Array(windowCount);
  const legacyWindows = new Uint8Array(windowCount);
  for (let i = 0; i < windowCount; i++) {
    visibleWindows[i] = i & 1;
    minimizedWindows[i] = (i & 3) === 0 ? 1 : 0;
  }
  const legacyPlans = (visible: Uint8Array, plans: Uint8Array): number => {
    let checksum = 0;
    for (let i = 0; i < visible.length; i++) {
      const plan = visible[i] ? 1 : 2;
      plans[i] = plan;
      checksum += plan;
    }
    return checksum;
  };
  for (let warm = 0; warm < 2; warm++) {
    fillWorkspaceFloatingPlans(visibleWindows, minimizedWindows, plannedWindows);
    legacyPlans(visibleWindows, legacyWindows);
  }
  const planStarted = performance.now();
  const planChecksum = fillWorkspaceFloatingPlans(visibleWindows, minimizedWindows, plannedWindows);
  const planMs = performance.now() - planStarted;
  const legacyStarted = performance.now();
  const legacyChecksum = legacyPlans(visibleWindows, legacyWindows);
  const legacyMs = performance.now() - legacyStarted;
  check(
    "百万扇窗口显隐规划不超过 50ms",
    planMs <= 50 && plannedWindows[0] === 0 && plannedWindows[1] === 1 && planChecksum > 0,
    planMs,
  );
  check(
    "百万扇规划不超过改前判断的 10%",
    planMs <= legacyMs * 1.1 + 0.25 && legacyChecksum > 0,
    { planMs, legacyMs },
  );

  const raisesMain: Array<[SearchWindowCommand["type"], boolean]> = [
    ["hide-recent", false],
    ["archive-ai", false],
    ["continue-ai", true],
    ["ask-ai", true],
    ["open-settings", true],
    ["split", true],
    ["open-beside", true],
    ["ai-slash", true],
  ];
  check(
    "静默命令不抬主窗",
    raisesMain.every(([type, raises]) => searchCommandRaisesMainWindow(type) === raises),
  );

  const activation = readFileSync(join(process.cwd(), "electron/main/windows/activation.ts"), "utf8");
  const raiseStart = activation.indexOf("export function raiseFloatingWindow");
  const raiseEnd = activation.indexOf("export async function toggleWindow");
  const raise = activation.slice(raiseStart, raiseEnd);
  const searchMain = readFileSync(join(process.cwd(), "electron/main/windows/search.ts"), "utf8");
  check("先快照再显示小窗", raise.indexOf("snapshotWorkspacePlans") < raise.indexOf("presentFloatingWindow") && raise.indexOf("presentFloatingWindow") < raise.indexOf("applyWorkspacePlans"));
  check("下一拍仍按快照双向纠正", raise.indexOf("applyWorkspacePlans") !== raise.lastIndexOf("applyWorkspacePlans"));
  check("不再把可见窗口当成已隐藏", !activation.includes("shouldKeepWorkspaceHiddenAfterQuicknote") && !activation.includes("restoreHiddenWorkspaces"));
  check("纠正期间失焦不收起搜索窗", searchMain.includes("isFloatingRaiseActive"));
  check("分发命令走同一套是否抬主窗", searchMain.includes("searchCommandRaisesMainWindow"));
  const mainIndex = readFileSync(join(process.cwd(), "electron/main/index.ts"), "utf8");
  const focusStart = mainIndex.indexOf("function focusExistingWorkspace");
  const focusBody = mainIndex.slice(focusStart, mainIndex.indexOf("app.on(\"second-instance\"", focusStart));
  check("Dock 唤出主窗会放开保持隐藏", focusBody.indexOf("releaseHeldWorkspace") !== -1 && focusBody.indexOf("releaseHeldWorkspace") < focusBody.indexOf("win.show()"));
  const quicknoteMain = readFileSync(join(process.cwd(), "electron/main/windows/quicknote.ts"), "utf8");
  check("搜索小窗不全空间显示时藏起主窗", searchMain.includes("skipTransformProcessType: true"));
  check("速记小窗不全空间显示时藏起主窗", quicknoteMain.includes("skipTransformProcessType: true"));
  check("搜索小窗不是 panel", !searchMain.includes("type: \"panel\"") && !searchMain.includes("type: 'panel'"));
  check("速记小窗不是 panel", !quicknoteMain.includes("type: \"panel\"") && !quicknoteMain.includes("type: 'panel'"));
  check("唤出小窗不切换激活策略", !activation.includes("setActivationPolicy"));
  const showSearch = searchMain.slice(searchMain.indexOf("export async function showSearchWindow"), searchMain.indexOf("export function hideSearchWindow"));
  check("创建搜索窗之前先记下主窗", showSearch.indexOf("captureWorkspacePlans") < showSearch.indexOf("createSearchWindow"));
  const showQuick = activation.slice(activation.indexOf("export async function toggleQuicknoteWindow"), activation.indexOf("export function closeQuicknote"));
  check("创建速记之前先记下主窗", showQuick.indexOf("captureWorkspacePlans") < showQuick.indexOf("createQuicknoteWindow"));

  return checker.failed;
}
