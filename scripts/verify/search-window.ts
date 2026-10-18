import { createChecker } from "./lib/check";
import {
  centeredSearchWindowBounds,
  parseOpenSearchResultPayload,
  parseSearchWindowCommand,
  resolveSearchHotkeySurface,
  resolveSearchResultPageId,
  SEARCH_WINDOW_HEIGHT,
  SEARCH_WINDOW_WIDTH,
  type SearchHotkeySource,
  type SearchHotkeySurface,
} from "../../src/lib/electron/searchWindow";
import { gooseWindowAdditionalArguments, parseGooseWindowArgs } from "../../src/lib/electron/windowContext";

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
  check("坏来源拒绝", parseSearchWindowCommand({ type: "continue-ai", notebookId: "nb", question: "q", text: "", sources: [{ id: "", title: "周报", index: 1 }] }) === null);
  check("打开 AI 设置", parseSearchWindowCommand({ type: "open-settings", tab: "ai" })?.type === "open-settings");
  check("其他设置页拒绝", parseSearchWindowCommand({ type: "open-settings", tab: "general" }) === null);
  check("隐藏最近", parseSearchWindowCommand({ type: "hide-recent" })?.type === "hide-recent");
  check("分屏动作", parseSearchWindowCommand({ type: "split", action: "split-right" })?.type === "split");
  check("未知分屏拒绝", parseSearchWindowCommand({ type: "split", action: "equalize" }) === null);
  check("未知命令拒绝", [null, "continue-ai", { type: "ask" }].every((value) => parseSearchWindowCommand(value) === null));

  return checker.failed;
}
