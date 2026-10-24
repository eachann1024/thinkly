import { createChecker } from "./lib/check";
import { initialSearchSession, transitionSearchSession, type SearchSessionState } from "../../src/pages/workspace/components/sidebar/searchSessionState";

function phase(state: SearchSessionState) {
  return state.view.phase;
}
function context(state: SearchSessionState) {
  return state.view.phase === "closed" ? null : state.view.context;
}

export default async function run(): Promise<number> {
  const checker = createChecker();
  const { check } = checker;

  const sheet = transitionSearchSession(initialSearchSession, { type: "opened", notebookId: "nb", pageId: "origin", scrollTop: 40 });
  check("打开弹窗记下起始笔记，还没有结果页", phase(sheet) === "sheet" && context(sheet)?.originPageId === "origin" && context(sheet)?.originScrollTop === 40 && context(sheet)?.resultPageId === null, context(sheet));

  const filtered = transitionSearchSession(
    transitionSearchSession(sheet, { type: "query-edited", query: "视频" }),
    { type: "scope-edited", scope: { kind: "current", notebookId: "nb" } },
  );
  const result = transitionSearchSession(filtered, { type: "target-requested", pageId: "hit", enterReader: true, restoreTop: null });
  const resultContext = context(result);
  check("打开结果后底栏只属于这一篇，查询和范围保留", phase(result) === "reader" && resultContext?.resultPageId === "hit" && resultContext.originPageId === "origin" && result.query === "视频" && result.scope.kind === "current", resultContext);
  check("打开结果会去那一篇", result.navigation.phase === "target" && result.navigation.pageId === "hit" && result.navigation.enterReader);

  const again = transitionSearchSession(result, { type: "sheet-reopened" });
  check("从底栏回到弹窗不改查询、范围和结果页", phase(again) === "sheet" && again.query === "视频" && again.scope.kind === "current" && context(again)?.resultPageId === "hit" && context(again)?.originPageId === "origin");

  const back = transitionSearchSession(again, { type: "sheet-dismissed" });
  check("关掉弹窗回到这篇结果，而不是结束搜索", phase(back) === "reader" && context(back)?.resultPageId === "hit");

  const home = transitionSearchSession(back, { type: "target-requested", pageId: "origin", enterReader: false, restoreTop: 40 });
  check("返回起始笔记时它仍是普通笔记，结果页不变", phase(home) === "reader" && context(home)?.resultPageId === "hit" && home.navigation.phase === "target" && home.navigation.pageId === "origin" && home.navigation.restoreTop === 40 && home.navigation.enterReader === false);

  const left = transitionSearchSession(home, { type: "closed" });
  check("关掉底栏后搜索结束，笔记不再带着命中", phase(left) === "closed" && left.navigation.phase === "none" && left.query === "视频");

  const recentSheet = transitionSearchSession(initialSearchSession, { type: "opened", notebookId: "nb", pageId: "origin", scrollTop: 0 });
  const recent = transitionSearchSession(recentSheet, { type: "target-requested", pageId: "recent", enterReader: true, restoreTop: null });
  check("没有查询词时打开笔记直接结束搜索，页面仍会打开", phase(recent) === "closed" && recent.navigation.phase === "target" && recent.navigation.pageId === "recent");

  const dismissed = transitionSearchSession(recentSheet, { type: "sheet-dismissed" });
  check("还没打开结果时关掉弹窗就结束搜索", phase(dismissed) === "closed" && dismissed.navigation.phase === "none");

  const shortcut = transitionSearchSession(result, { type: "opened", notebookId: "other", pageId: "elsewhere", scrollTop: 8 });
  check("搜索还开着时再次打开弹窗，仍记住原来的起始笔记和结果页", phase(shortcut) === "sheet" && context(shortcut)?.originPageId === "origin" && context(shortcut)?.resultPageId === "hit");

  check("已关闭时不能再指定结果页", phase(transitionSearchSession(left, { type: "target-requested", pageId: "hit", enterReader: true, restoreTop: null })) === "closed");
  check("不在结果里时不能只重开弹窗", phase(transitionSearchSession(sheet, { type: "sheet-reopened" })) === "sheet" && context(transitionSearchSession(sheet, { type: "sheet-reopened" }))?.resultPageId === null);

  return checker.failed;
}
