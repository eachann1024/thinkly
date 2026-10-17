import { BrowserWindow, Menu } from "electron";
import { createTranslator, i18nYaml } from "../../../src/i18n/core";
import { CLOSE_TAB_ACCELERATOR, CLOSE_WINDOW_ACCELERATOR } from "../closeTabAccelerator";
import { createWorkspaceWindow, getMainWindow, requestCloseActiveTab } from "../windows";
import { localizedAppName } from "./appName";

const t = createTranslator(i18nYaml<"electron/main/i18n/menu.ts#block1:1">`
zh-Hans:
  about: 关于思绪 · Thinkly
  services: 服务
  hide: 隐藏思绪 · Thinkly
  hideOthers: 隐藏其他
  showAll: 显示全部
  quit: 退出思绪 · Thinkly
  file: 文件
  newWindow: 新建窗口
  closeTab: 关闭标签
  closeWindow: 关闭窗口
  edit: 编辑
  undo: 撤销
  redo: 重做
  cut: 剪切
  copy: 复制
  paste: 粘贴
  pastePlain: 粘贴并匹配样式
  delete: 删除
  selectAll: 全选
  speech: 语音
  startSpeaking: 开始朗读
  stopSpeaking: 停止朗读
  view: 视图
  reload: 重新加载
  forceReload: 强制重新加载
  devTools: 开发者工具
  fullscreen: 切换全屏
  window: 窗口
  minimize: 最小化
  zoom: 缩放
  front: 前置全部窗口
en:
  about: About Thinkly
  services: Services
  hide: Hide Thinkly
  hideOthers: Hide Others
  showAll: Show All
  quit: Quit Thinkly
  file: File
  newWindow: New Window
  closeTab: Close Tab
  closeWindow: Close Window
  edit: Edit
  undo: Undo
  redo: Redo
  cut: Cut
  copy: Copy
  paste: Paste
  pastePlain: Paste and Match Style
  delete: Delete
  selectAll: Select All
  speech: Speech
  startSpeaking: Start Speaking
  stopSpeaking: Stop Speaking
  view: View
  reload: Reload
  forceReload: Force Reload
  devTools: Developer Tools
  fullscreen: Toggle Full Screen
  window: Window
  minimize: Minimize
  zoom: Zoom
  front: Bring All to Front
ja:
  about: "Thinkly について"
  services: "サービス"
  hide: "Thinkly を非表示"
  hideOthers: "ほかを非表示"
  showAll: "すべてを表示"
  quit: "Thinkly を終了"
  file: "ファイル"
  newWindow: "新規ウィンドウ"
  closeTab: "タブを閉じる"
  closeWindow: "ウィンドウを閉じる"
  edit: "編集"
  undo: "元に戻す"
  redo: "やり直す"
  cut: "切り取り"
  copy: "コピー"
  paste: "貼り付け"
  pastePlain: "ペーストしてスタイルを合わせる"
  delete: "削除"
  selectAll: "すべてを選択"
  speech: "音声"
  startSpeaking: "読み上げを開始"
  stopSpeaking: "読み上げを停止"
  view: "表示"
  reload: "再読み込み"
  forceReload: "強制的に再読み込み"
  devTools: "開発者ツール"
  fullscreen: "フルスクリーンを切り替え"
  window: "ウィンドウ"
  minimize: "最小化"
  zoom: "拡大/縮小"
  front: "すべてを手前に移動"
`);

export function installMenu(): void {
  // Preserve the Windows/Linux behavior: Alt does not open a native menu.
  if (process.platform !== "darwin") { Menu.setApplicationMenu(null); return; }
  const template: Electron.MenuItemConstructorOptions[] = [
    { label: localizedAppName(), submenu: [
      { role: "about", label: t("about") }, { type: "separator" },
      { role: "services", label: t("services") }, { type: "separator" },
      { role: "hide", label: t("hide") }, { role: "hideOthers", label: t("hideOthers") },
      { role: "unhide", label: t("showAll") }, { type: "separator" },
      { role: "quit", label: t("quit") },
    ] },
    { label: t("file"), submenu: [
      { label: t("newWindow"), accelerator: "CommandOrControl+Shift+N", click: () => createWorkspaceWindow({ mode: "blank", sourceWindow: getMainWindow() }) },
      { type: "separator" },
      { label: t("closeTab"), accelerator: CLOSE_TAB_ACCELERATOR, click: (_item, win) => requestCloseActiveTab(win instanceof BrowserWindow ? win : getMainWindow()) },
      { label: t("closeWindow"), accelerator: CLOSE_WINDOW_ACCELERATOR, click: (_item, win) => (win ?? getMainWindow())?.close() },
    ] },
    { label: t("edit"), submenu: [
      { role: "undo", label: t("undo") }, { role: "redo", label: t("redo") }, { type: "separator" },
      { role: "cut", label: t("cut") }, { role: "copy", label: t("copy") },
      { role: "paste", label: t("paste") }, { role: "pasteAndMatchStyle", label: t("pastePlain") },
      { role: "delete", label: t("delete") }, { role: "selectAll", label: t("selectAll") },
      { type: "separator" }, { label: t("speech"), submenu: [
        { role: "startSpeaking", label: t("startSpeaking") }, { role: "stopSpeaking", label: t("stopSpeaking") },
      ] },
    ] },
    { label: t("view"), submenu: [
      { role: "reload", label: t("reload") }, { role: "forceReload", label: t("forceReload") },
      { role: "toggleDevTools", label: t("devTools") }, { type: "separator" },
      { role: "togglefullscreen", label: t("fullscreen") },
    ] },
    { role: "window", label: t("window"), submenu: [
      { role: "minimize", label: t("minimize") }, { role: "zoom", label: t("zoom") },
      { type: "separator" }, { role: "front", label: t("front") },
    ] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
