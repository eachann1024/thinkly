import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/shortcut-settings/sections/shortcutConfig.tsx#localMessages:1">`
zh-Hans:
  newNote_e82d: "新建笔记"
  newWindow_eded: "新建窗口"
  findInNote_fc76: "页内查找"
  replaceInNote_a796: "页内替换"
  collapseOtherFoldersWhenTheSidebar_2098: "侧栏聚焦时收起其他文件夹（优先于关闭笔记）"
  reopenLastClosedTab_8743: "恢复最近关闭的标签页"
  closeCurrentContentInClosingOrder_c9e7: "按关闭顺序关闭当前内容（桌面）"
  closeWindowMacos_f73b: "关闭窗口（macOS）"
  openSettings_6342: "打开设置"
  switchSidebarViewLocalOutlineSearch_b198: "按图标栏顺序切换入口（本地 / AI / 大纲 / 搜索）"
  switchTabs48ByPosition_df0c: "切换标签页（5~8 对应序号，9 到最后）"
  nextTab_2438: "循环切换标签页"
  previousTab_4c44: "反向循环切换标签页"
  findNext_d7b5: "查找下一处"
  findPrevious_9594: "查找上一处"
  increaseFontSize_6121: "字号放大"
  decreaseFontSize_2b2b: "字号缩小"
  resetFontSize_bf64: "重置字号"
  findNextF3_025b: "继续查找（F3）"
  findPrevious_4365: "反向继续查找"
  saveManuallyWriteLocalFilesTo_a7bc: "手动保存（本地文件立即写盘）"
  bold_3b8a: "加粗"
  italic_81d6: "斜体"
  underline_f6f8: "下划线"
  inlineCode_a7aa: "行内代码"
  strikethrough_a120: "删除线"
  headingLevels13_a78b: "标题 1～3 级"
  moveBlockUp_9b50: "上移编辑块"
  moveBlockDown_549f: "下移编辑块"
  addSelectionToAiConversationWhen_fdd9: "选区加入 AI 对话（AI 开启时）"
  renameSidebarPage_4632: "重命名侧栏页面"
  deleteSelectedSidebarPage_e445: "删除侧栏选中页面"
  moveLocalFileOrFolder_3209: "移动本地文件/文件夹"
  openCurrentLocalFileInAn_57e5: "用外部应用打开当前本地文件"
  showCurrentLocalFileInFile_7d91: "在文件管理器中显示当前本地文件"
  openCurrentLocalFileInTerminal_d5cd: "在终端中打开当前本地文件"
  copyCurrentFilePath_7dea: "复制当前文件路径"
  selectAll_66ee: "全选"
  undo_bd9f: "撤销"
  redo_c3c8: "重做"
  redoWindows_72a1: "重做（Windows）"
en:
  newNote_e82d: "New note"
  newWindow_eded: "New window"
  findInNote_fc76: "Find in note"
  replaceInNote_a796: "Replace in note"
  collapseOtherFoldersWhenTheSidebar_2098: "Collapse other folders when the sidebar has focus (takes priority over closing the note)"
  reopenLastClosedTab_8743: "Reopen last closed tab"
  closeCurrentContentInClosingOrder_c9e7: "Close current content in closing order (desktop)"
  closeWindowMacos_f73b: "Close window (macOS)"
  openSettings_6342: "Open settings"
  switchSidebarViewLocalOutlineSearch_b198: "Switch sidebar rail items in order (Local / AI / Outline / Search)"
  switchTabs48ByPosition_df0c: "Switch tabs (5–8 by position; 9 for the last tab)"
  nextTab_2438: "Next tab"
  previousTab_4c44: "Previous tab"
  findNext_d7b5: "Find next"
  findPrevious_9594: "Find previous"
  increaseFontSize_6121: "Increase font size"
  decreaseFontSize_2b2b: "Decrease font size"
  resetFontSize_bf64: "Reset font size"
  findNextF3_025b: "Find next (F3)"
  findPrevious_4365: "Find previous"
  saveManuallyWriteLocalFilesTo_a7bc: "Save manually (write local files to disk immediately)"
  bold_3b8a: "Bold"
  italic_81d6: "Italic"
  underline_f6f8: "Underline"
  inlineCode_a7aa: "Inline code"
  strikethrough_a120: "Strikethrough"
  headingLevels13_a78b: "Heading levels 1–3"
  moveBlockUp_9b50: "Move block up"
  moveBlockDown_549f: "Move block down"
  addSelectionToAiConversationWhen_fdd9: "Add selection to AI conversation (when AI is enabled)"
  renameSidebarPage_4632: "Rename sidebar page"
  deleteSelectedSidebarPage_e445: "Delete selected sidebar page"
  moveLocalFileOrFolder_3209: "Move local file or folder"
  openCurrentLocalFileInAn_57e5: "Open current local file in an external app"
  showCurrentLocalFileInFile_7d91: "Show current local file in file manager"
  openCurrentLocalFileInTerminal_d5cd: "Open current local file in terminal"
  copyCurrentFilePath_7dea: "Copy current file path"
  selectAll_66ee: "Select all"
  undo_bd9f: "Undo"
  redo_c3c8: "Redo"
  redoWindows_72a1: "Redo (Windows)"
`;
const uiText = createTranslator(localMessages);
import { isMacPlatform, type PlatformKind } from "@/lib/utils";
import {
  FIXED_CLOSE_SHORTCUT,
  FIXED_SPLIT_SHORTCUTS,
  getFixedAppShortcuts,
} from "@/lib/fixed-app-shortcuts";
import { LOCAL_FOLDER_FILE_SHORTCUTS } from "@/lib/local-folder-file-actions";

export interface SettingsShortcutsProps {
  closeTabShortcut: string;
  setCloseTabShortcut: (shortcut: string) => void;
  searchPanelCloseShortcut: string;
  setSearchPanelCloseShortcut: (shortcut: string) => void;
  appShortcuts: Record<string, string>;
  setAppShortcut: (id: string, shortcut: string) => void;
  resetAppShortcuts: () => void;
  singleTabMode: boolean;
}

export const SETTINGS_OPTION_ROW_CLASS =
  "goose-settings-option-row";

export const FIXED_APP_SHORTCUTS = getFixedAppShortcuts();

export /** 单标签模式下 UI 与热键均禁用的自定义动作，不参与冲突占用。 */
const TAB_ONLY_APP_SHORTCUT_IDS = new Set(["newTab"]);

export const ALWAYS_FIXED_SHORTCUT_VALUES = [
  FIXED_CLOSE_SHORTCUT,
  ...Object.values(FIXED_SPLIT_SHORTCUTS).filter(Boolean),
  FIXED_APP_SHORTCUTS.openSettings,
  FIXED_APP_SHORTCUTS.editorFindOpen,
  "Mod+Alt+F",
  FIXED_APP_SHORTCUTS.newNote,
  "Mod+G",
  "Mod+Shift+G",
  "Mod+=",
  "Mod+-",
  "Mod+0",
  "F3",
  "Shift+F3",
  // 浏览器/编辑器固定行为不可被自定义动作覆盖。
  "Mod+S",
  "Mod+1",
  "Mod+2",
  "Mod+3",
  "Mod+4",
  "Mod+A",
  "Mod+Z",
  "Mod+Shift+Z",
  "Mod+Y",
  LOCAL_FOLDER_FILE_SHORTCUTS.moveItem,
  LOCAL_FOLDER_FILE_SHORTCUTS.openInExternalApp,
  LOCAL_FOLDER_FILE_SHORTCUTS.revealInFileManager,
  LOCAL_FOLDER_FILE_SHORTCUTS.openInTerminal,
  LOCAL_FOLDER_FILE_SHORTCUTS.copyFilePath,
  "Mod+Shift+N",
  "Mod+W",
  ...(isMacPlatform() ? ["Mod+Shift+W"] : []),
];

export /** 仅多标签模式生效的固定快捷键。 */
const TAB_ONLY_FIXED_SHORTCUT_VALUES = [
  "Mod+W",
  FIXED_APP_SHORTCUTS.reopenTab,
  ...Array.from({ length: 5 }, (_, index) => `Mod+${index + 5}`),
  "Ctrl+Tab",
  "Ctrl+Shift+Tab",
];

export const FIXED_SHORTCUT_VALUES = [
  ...ALWAYS_FIXED_SHORTCUT_VALUES,
  ...TAB_ONLY_FIXED_SHORTCUT_VALUES,
];

export const FIXED_SHORTCUTS: Array<{
  label: string;
  shortcut: string;
  tabOnly?: boolean;
  platforms?: PlatformKind[];
}> = [
  { get label() { return uiText("newNote_e82d"); }, shortcut: FIXED_APP_SHORTCUTS.newNote },
  { get label() { return uiText("newWindow_eded"); }, shortcut: "Mod+Shift+N" },
  { get label() { return uiText("findInNote_fc76"); }, shortcut: FIXED_APP_SHORTCUTS.editorFindOpen },
  { get label() { return uiText("replaceInNote_a796"); }, shortcut: "Mod+Alt+F" },
  { get label() { return uiText("collapseOtherFoldersWhenTheSidebar_2098"); }, shortcut: "Escape" },
  {
    get label() { return uiText("reopenLastClosedTab_8743"); },
    shortcut: FIXED_APP_SHORTCUTS.reopenTab,
    tabOnly: true,
  },
  {
    get label() { return uiText("closeCurrentContentInClosingOrder_c9e7"); },
    shortcut: "Mod+W",
  },
  {
    get label() { return uiText("closeWindowMacos_f73b"); },
    shortcut: "Mod+Shift+W",
    platforms: ["mac"],
  },
  { get label() { return uiText("openSettings_6342"); }, shortcut: FIXED_APP_SHORTCUTS.openSettings },
  { get label() { return uiText("switchSidebarViewLocalOutlineSearch_b198"); }, shortcut: "Mod+1~4" },
  {
    get label() { return uiText("switchTabs48ByPosition_df0c"); },
    shortcut: "Mod+5~9",
    tabOnly: true,
  },
  { get label() { return uiText("nextTab_2438"); }, shortcut: "Ctrl+Tab", tabOnly: true },
  { get label() { return uiText("previousTab_4c44"); }, shortcut: "Ctrl+Shift+Tab", tabOnly: true },
  { get label() { return uiText("findNext_d7b5"); }, shortcut: "Mod+G" },
  { get label() { return uiText("findPrevious_9594"); }, shortcut: "Mod+Shift+G" },
  { get label() { return uiText("increaseFontSize_6121"); }, shortcut: "Mod+=" },
  { get label() { return uiText("decreaseFontSize_2b2b"); }, shortcut: "Mod+-" },
  { get label() { return uiText("resetFontSize_bf64"); }, shortcut: "Mod+0" },
  { get label() { return uiText("findNextF3_025b"); }, shortcut: "F3" },
  { get label() { return uiText("findPrevious_4365"); }, shortcut: "Shift+F3" },
  { get label() { return uiText("saveManuallyWriteLocalFilesTo_a7bc"); }, shortcut: "Mod+S" },
  { get label() { return uiText("bold_3b8a"); }, shortcut: "Mod+B" },
  { get label() { return uiText("italic_81d6"); }, shortcut: "Mod+I" },
  { get label() { return uiText("underline_f6f8"); }, shortcut: "Mod+U" },
  { get label() { return uiText("inlineCode_a7aa"); }, shortcut: "Mod+E" },
  { get label() { return uiText("strikethrough_a120"); }, shortcut: "Mod+Shift+S" },
  { get label() { return uiText("headingLevels13_a78b"); }, shortcut: "Mod+Alt+1~3" },
  { get label() { return uiText("moveBlockUp_9b50"); }, shortcut: "Alt+ArrowUp" },
  { get label() { return uiText("moveBlockDown_549f"); }, shortcut: "Alt+ArrowDown" },
  { get label() { return uiText("addSelectionToAiConversationWhen_fdd9"); }, shortcut: "Mod+Shift+U" },
  { get label() { return uiText("renameSidebarPage_4632"); }, shortcut: "F2" },
  { get label() { return uiText("deleteSelectedSidebarPage_e445"); }, shortcut: "Mod+Backspace" },
  {
    get label() { return uiText("moveLocalFileOrFolder_3209"); },
    shortcut: LOCAL_FOLDER_FILE_SHORTCUTS.moveItem,
  },
  {
    get label() { return uiText("openCurrentLocalFileInAn_57e5"); },
    shortcut: LOCAL_FOLDER_FILE_SHORTCUTS.openInExternalApp,
  },
  {
    get label() { return uiText("showCurrentLocalFileInFile_7d91"); },
    shortcut: LOCAL_FOLDER_FILE_SHORTCUTS.revealInFileManager,
  },
  {
    get label() { return uiText("openCurrentLocalFileInTerminal_d5cd"); },
    shortcut: LOCAL_FOLDER_FILE_SHORTCUTS.openInTerminal,
  },
  {
    get label() { return uiText("copyCurrentFilePath_7dea"); },
    shortcut: LOCAL_FOLDER_FILE_SHORTCUTS.copyFilePath,
  },
  { get label() { return uiText("selectAll_66ee"); }, shortcut: "Mod+A" },
  { get label() { return uiText("undo_bd9f"); }, shortcut: "Mod+Z" },
  { get label() { return uiText("redo_c3c8"); }, shortcut: "Mod+Shift+Z" },
  { get label() { return uiText("redoWindows_72a1"); }, shortcut: "Mod+Y", platforms: ["windows"] },
];

export const FIXED_SHORTCUT_PLATFORMS: { id: PlatformKind; label: string }[] = [
  { id: "mac", label: "macOS" },
  { id: "windows", label: "Windows" },
  { id: "linux", label: "Linux" },
];
