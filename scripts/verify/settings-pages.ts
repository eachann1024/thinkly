/** 设置页隔离、页面状态保留与笔记 AI 会话生命周期。 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { createChecker } from "./lib/check";

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");
const shell = read("src/pages/workspace/layout/renderWorkspaceShell.tsx");
const notebook = read("src/pages/workspace/layout/surfaces/WorkspaceNotebookPage.tsx");
const page = read("src/pages/workspace/components/sidebar/settings/SettingsPage.tsx");
const scaffold = read("src/pages/workspace/components/sidebar/settings/SettingsScaffold.tsx");
const render = read("src/pages/workspace/components/sidebar/settings-dialog/renderSettingsScaffold.tsx");
const activity = read("src/pages/workspace/components/WorkspaceViewActivity.tsx");
const settingsNavigation = read("src/pages/workspace/layout/useWorkspaceSettingsNavigation.tsx");
const aiSession = read("src/pages/workspace/components/notebook-ai/NotebookAiSession.tsx");
const layout = read("src/pages/workspace/components/sidebar/settings/settings-layout.css");
const restoration = read("src/pages/workspace/hooks/useScrollRestoration.ts");
const splitPane = read("src/pages/workspace/components/editor-split/SplitEditorPane.tsx");
const contentCommit = read("src/components/editor/core/useEditorContentCommit.ts");
const undoLifecycle = read("src/components/editor/core/useEditorPageLifecycle.ts");
const undoHistory = read("src/components/editor/core/pageUndoHistory.ts");
const overlays = read("src/pages/workspace/styles/editor-base/overlays.css");

export default function run(): number {
  const checker = createChecker();
  const check = checker.check;
  const tabs = ["appearance", "general", "shortcuts", "local-folder", "git-sync", "ai", "data", "feedback"];

  check(
    "工作区 shell 只委托笔记页 surface，设置 portal 到该主内容区",
    /<WorkspaceNotebookPage context=\{context\}\s*\/>/.test(shell) &&
      /mainContainer=\{mainContainer\}/.test(render) &&
      /ref=\{setSettingsHost\}/.test(shell),
  );
  check("笔记页设置打开时从 DOM 隔离，AI Provider 仍挂在笔记页外壳", /settingsOpen \? null/.test(notebook) && /hidden=\{settingsOpen\}/.test(notebook) && /inert=\{settingsOpen\}/.test(notebook) && /<NotebookAiSessionProvider/.test(notebook));
  check("AI 面板关闭期间 session binder 仍由 Provider 持有", /if \(panelOpen && !held\) setHeld\(true\)/.test(aiSession) && /\{held \?/.test(aiSession) && /panelOpen=\{!settingsOpen && panelOpen\}/.test(notebook));
  check("Provider 继续包住空 children，切设置不会卸载其会话运行时", /<NotebookAiSessionContext\.Provider value=\{session\}>[\s\S]*?\{children\}/.test(aiSession) && /const body = settingsOpen \? null/.test(notebook));

  check("八个设置分类各自进入 SettingsPage", tabs.every((tab) => render.includes(`<SettingsPage tab="${tab}"`)));
  check("各设置页独立页头和独立纵向滚动容器", /data-settings-tab=\{tab\}/.test(page) && /settings-page-\$\{tab\}/.test(page) && /className="settings-scroll h-full overflow-y-auto"/.test(page));
  check("Tab 隐藏期间保留已访问页面 DOM 与组件草稿", /<WorkspaceViewActivity visible=\{visible\} keepAlive=\{keepAlive\}/.test(page) && /if \(visible && !visited\) setVisited\(true\)/.test(activity) && /<Activity mode=\{visible \? "visible" : "hidden"\}>/.test(activity));
  check("每页有可收缩的 flex 容器和独立主题画布", /\.settings-page-view \{[^}]*flex: 1;[^}]*min-height: 0;[^}]*overflow: hidden/.test(layout) && /\.settings-tab-page \{ height: 100%; min-height: 0; min-width: 0;/.test(layout));
  check("Tab 状态由工作区导航持有，页面关闭时卸载访问过的草稿", /const \[settingsTab, setSettingsTab\] = useState<SettingsTab>\("appearance"\)/.test(settingsNavigation) && /keepAlive=\{open\}/.test(render));
  check("编辑器换页时读取并恢复 pageId 的滚动位置，卸载时保存当前位置", /pageScrollPositions\[pageId\] = container\.scrollTop/.test(restoration) && /const targetTop = typeof savedTop === "number" \? savedTop : 0/.test(restoration) && /currentContainer\.scrollTop = targetTop/.test(restoration) && /useScrollRestoration\(leaf\.pageId, scrollElRef\)/.test(splitPane));
  check("编辑器卸载前提交待写内容并经最新 onContentChangeRef 入 store", /return \(\) => \{[\s\S]*?commitEditorContent\(pageIdForUpdateRef\.current \?\? undefined\)/.test(contentCommit) && /commit: \(nextContent\) => onContentChangeRef\.current\(nextContent\)/.test(contentCommit) && /input\.commit\(input\.content\)/.test(read("src/components/editor/core/editorPendingCommit.ts")));
  check("笔记切换时保存撤销快照，返回时按内容签名恢复撤销状态与 selection bookmark", /pageUndoHistory\.save\(id, editor\.prosemirrorState, signature, cachedSource\)/.test(undoLifecycle) && /pageUndoHistory\.restore\([\s\S]*?activePageId,[\s\S]*?signature/.test(undoLifecycle) && /selection: snapshot\.state\.selection\.getBookmark\(\)\.resolve\(doc\)/.test(undoHistory));
  check("设置/AI 全屏时表格左右及上下四边控件统一隐藏", [".goose-table-chrome-left", ".goose-table-chrome-top", ".goose-table-chrome-right", ".goose-table-chrome-bottom"].every((selector) => overlays.includes(`body:is([data-goose-settings-open], [data-goose-ai-fullscreen]) ${selector},`)) && /display: none !important;/.test(overlays));
  check("外观页的特殊满高布局与 shortcuts/git-sync 样式改用新 page 容器", /\.settings-tab-page\[data-settings-tab="appearance"\] \.settings-panel/.test(layout) && /\.settings-tab-page\[data-settings-tab="shortcuts"\]/.test(layout) && /\.settings-tab-page\[data-settings-tab="git-sync"\]/.test(layout));

  return checker.failed;
}
