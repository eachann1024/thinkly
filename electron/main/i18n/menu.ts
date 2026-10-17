import { BrowserWindow, Menu } from "electron";
import { createTranslator, i18nYaml } from "../../../src/i18n/core";
import { CLOSE_TAB_ACCELERATOR, CLOSE_WINDOW_ACCELERATOR } from "../closeTabAccelerator";
import { createWorkspaceWindow, getMainWindow, requestCloseActiveTab } from "../windows";
import { getLanguageSnapshot } from "./store";

export function localizedAppName(): string {
  try {
    return getLanguageSnapshot().effectiveLocale === "zh-Hans" ? "鹅的笔记" : "Goose Note";
  } catch {
    return "Goose Note";
  }
}

const t = createTranslator(i18nYaml<"electron/main/i18n/menu.ts#block1:1">`
zh-Hans:
  about: 关于鹅的笔记
  services: 服务
  hide: 隐藏鹅的笔记
  hideOthers: 隐藏其他
  showAll: 显示全部
  quit: 退出鹅的笔记
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
  about: About Goose Note
  services: Services
  hide: Hide Goose Note
  hideOthers: Hide Others
  showAll: Show All
  quit: Quit Goose Note
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
