import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/shortcut-settings/sections/shortcutGroups.ts#localMessages:1">`
zh-Hans:
  notesAndWindows_5c23: "笔记与窗口"
  newNote_e82d: "新建笔记"
  newWindow_eded: "新建窗口"
  openSettings_6342: "打开设置"
  switchSidebarViewLocalOutlineSearch_b198: "切换侧栏视图（本地 / 大纲 / 搜索）"
  toggleSidebar_21f7: "切换侧栏"
  collapseOtherFoldersWhenTheSidebar_2098: "侧栏聚焦时收起其它文件夹（优先于关闭笔记）"
  collapseOtherFolders_a0d4: "收起其他文件夹"
  renameSidebarPage_4632: "重命名侧栏页面"
  renamePage_c9d0: "重命名页面"
  deleteSelectedSidebarPage_e445: "删除侧栏选中页面"
  deletePage_f633: "删除页面"
  tabs_288c: "标签页"
  reopenLastClosedTab_8743: "恢复最近关闭的标签页"
  reopenLastClosedTab_a55b: "恢复最近关闭的标签页"
  switchTabs48ByPosition_df0c: "切换标签页（4~8 对应序号，9 到最后）"
  switchTabs_b153: "切换标签页"
  nextTab_2438: "循环切换标签页"
  previousTab_4c44: "反向循环切换标签页"
  closeCurrentContentInClosingOrder_c9e7: "按关闭顺序关闭当前内容（桌面）"
  closeInClosingOrder_ef46: "按关闭顺序关闭"
  closeWindowMacos_f73b: "关闭窗口（macOS）"
  closeWindow_3601: "关闭窗口"
  find_dc5d: "查找"
  findInNote_fc76: "页内查找"
  replaceInNote_a796: "页内替换"
  findNext_d7b5: "查找下一处"
  findPrevious_9594: "查找上一处"
  findNextF3_025b: "继续查找（F3）"
  findNext_a355: "继续查找"
  findPrevious_4365: "反向继续查找"
  edit_95b3: "编辑"
  saveManuallyWriteLocalFilesTo_a7bc: "手动保存（本地文件立即写盘）"
  save_be5f: "保存"
  bold_3b8a: "加粗"
  italic_81d6: "斜体"
  underline_f6f8: "下划线"
  inlineCode_a7aa: "行内代码"
  strikethrough_a120: "删除线"
  headingLevels13_a78b: "标题 1～3 级"
  moveBlockUp_9b50: "上移编辑块"
  moveBlockDown_549f: "下移编辑块"
  addSelectionToAiConversationWhen_fdd9: "选区加入 AI 对话（AI 开启时）"
  addToAiConversation_3c5e: "加入 AI 对话"
  selectAll_66ee: "全选"
  undo_bd9f: "撤销"
  redo_c3c8: "重做"
  redoWindows_72a1: "重做（Windows）"
  increaseFontSize_6121: "字号放大"
  decreaseFontSize_2b2b: "字号缩小"
  resetFontSize_bf64: "重置字号"
  localFiles_7cfa: "本地文件"
  moveLocalFileOrFolder_3209: "移动本地文件/文件夹"
  moveFileOrFolder_5eee: "移动文件或文件夹"
  openCurrentLocalFileInAn_57e5: "用外部应用打开当前本地文件"
  openInAnotherApp_1d93: "用其他应用打开"
  showCurrentLocalFileInFile_7d91: "在文件管理器中显示当前本地文件"
  showInFileManager_235d: "在文件管理器中显示"
  openCurrentLocalFileInTerminal_d5cd: "在终端中打开当前本地文件"
  openInTerminal_004c: "在终端中打开"
  copyCurrentFilePath_7dea: "复制当前文件路径"
  copyFilePath_87f5: "复制文件路径"
  splitRight_8a36: "向右分屏"
  splitDown_f004: "向下分屏"
  focusLeft_4e1e: "焦点移到左侧"
  focusRight_f580: "焦点移到右侧"
  focusAbove_e3a3: "焦点移到上方"
  focusBelow_233a: "焦点移到下方"
  previousSplit_9249: "上一个分屏"
  nextSplit_b54f: "下一个分屏"
  maximizeCurrentSplit_4a67: "最大化当前分屏"
  closeCurrentSplit_b27d: "关闭当前分屏"
en:
  notesAndWindows_5c23: "Notes and windows"
  newNote_e82d: "New note"
  newWindow_eded: "New window"
  openSettings_6342: "Open settings"
  switchSidebarViewLocalOutlineSearch_b198: "Switch sidebar view (Local / Outline / Search)"
  toggleSidebar_21f7: "Toggle sidebar"
  collapseOtherFoldersWhenTheSidebar_2098: "Collapse other folders when the sidebar has focus (takes priority over closing the note)"
  collapseOtherFolders_a0d4: "Collapse other folders"
  renameSidebarPage_4632: "Rename sidebar page"
  renamePage_c9d0: "Rename page"
  deleteSelectedSidebarPage_e445: "Delete selected sidebar page"
  deletePage_f633: "Delete page"
  tabs_288c: "Tabs"
  reopenLastClosedTab_8743: "Reopen last closed tab"
  reopenLastClosedTab_a55b: "Reopen last closed tab"
  switchTabs48ByPosition_df0c: "Switch tabs (4–8 by position; 9 for the last tab)"
  switchTabs_b153: "Switch tabs"
  nextTab_2438: "Next tab"
  previousTab_4c44: "Previous tab"
  closeCurrentContentInClosingOrder_c9e7: "Close current content in closing order (desktop)"
  closeInClosingOrder_ef46: "Close in closing order"
  closeWindowMacos_f73b: "Close window (macOS)"
  closeWindow_3601: "Close window"
  find_dc5d: "Find"
  findInNote_fc76: "Find in note"
  replaceInNote_a796: "Replace in note"
  findNext_d7b5: "Find next"
  findPrevious_9594: "Find previous"
  findNextF3_025b: "Find next (F3)"
  findNext_a355: "Find next"
  findPrevious_4365: "Find previous"
  edit_95b3: "Edit"
  saveManuallyWriteLocalFilesTo_a7bc: "Save manually (write local files to disk immediately)"
  save_be5f: "Save"
  bold_3b8a: "Bold"
  italic_81d6: "Italic"
  underline_f6f8: "Underline"
  inlineCode_a7aa: "Inline code"
  strikethrough_a120: "Strikethrough"
  headingLevels13_a78b: "Heading levels 1–3"
  moveBlockUp_9b50: "Move block up"
  moveBlockDown_549f: "Move block down"
  addSelectionToAiConversationWhen_fdd9: "Add selection to AI conversation (when AI is enabled)"
  addToAiConversation_3c5e: "Add to AI conversation"
  selectAll_66ee: "Select all"
  undo_bd9f: "Undo"
  redo_c3c8: "Redo"
  redoWindows_72a1: "Redo (Windows)"
  increaseFontSize_6121: "Increase font size"
  decreaseFontSize_2b2b: "Decrease font size"
  resetFontSize_bf64: "Reset font size"
  localFiles_7cfa: "Local files"
  moveLocalFileOrFolder_3209: "Move local file or folder"
  moveFileOrFolder_5eee: "Move file or folder"
  openCurrentLocalFileInAn_57e5: "Open current local file in an external app"
  openInAnotherApp_1d93: "Open in another app"
  showCurrentLocalFileInFile_7d91: "Show current local file in file manager"
  showInFileManager_235d: "Show in file manager"
  openCurrentLocalFileInTerminal_d5cd: "Open current local file in terminal"
  openInTerminal_004c: "Open in terminal"
  copyCurrentFilePath_7dea: "Copy current file path"
  copyFilePath_87f5: "Copy file path"
  splitRight_8a36: "Split right"
  splitDown_f004: "Split down"
  focusLeft_4e1e: "Focus left"
  focusRight_f580: "Focus right"
  focusAbove_e3a3: "Focus above"
  focusBelow_233a: "Focus below"
  previousSplit_9249: "Previous split"
  nextSplit_b54f: "Next split"
  maximizeCurrentSplit_4a67: "Maximize current split"
  closeCurrentSplit_b27d: "Close current split"
`;
const uiText = createTranslator(localMessages);
import { getPlatformKind, type PlatformKind } from "@/lib/utils";
import {
  FIXED_CLOSE_SHORTCUT,
  FIXED_SPLIT_SHORTCUTS,
} from "@/lib/fixed-app-shortcuts";
import { FIXED_SHORTCUTS } from "./shortcutConfig";

export interface ShortcutGroupItem {
  label: string;
  shortcut: string;
}

export interface ShortcutGroup {
  id: string;
  title: string;
  items: ShortcutGroupItem[];
}

export function currentShortcutPlatform(): PlatformKind {
  const platform = getPlatformKind();
  return platform === "other" ? "windows" : platform;
}

export function fixedShortcutsForCurrentPlatform(
  singleTabMode: boolean,
): ShortcutGroup[] {
  const platform = currentShortcutPlatform();
  const visible = FIXED_SHORTCUTS.filter(
    (item) =>
      (!singleTabMode || !item.tabOnly) &&
      (!item.platforms || item.platforms.includes(platform)),
  );
  const take = (...entries: Array<string | [string, string]>) =>
    entries.flatMap((entry) => {
      const [source, label] = Array.isArray(entry) ? entry : [entry, entry];
      const item = visible.find((candidate) => candidate.label === source);
      return item ? [{ label, shortcut: item.shortcut }] : [];
    });

  return [
    {
      id: "notes",
      title: uiText("notesAndWindows_5c23"),
      items: take(
        uiText("newNote_e82d"),
        uiText("newWindow_eded"),
        uiText("openSettings_6342"),
        [uiText("switchSidebarViewLocalOutlineSearch_b198"), uiText("toggleSidebar_21f7")],
        [uiText("collapseOtherFoldersWhenTheSidebar_2098"), uiText("collapseOtherFolders_a0d4")],
        [uiText("renameSidebarPage_4632"), uiText("renamePage_c9d0")],
        [uiText("deleteSelectedSidebarPage_e445"), uiText("deletePage_f633")],
      ),
    },
    {
      id: "tabs",
      title: uiText("tabs_288c"),
      items: take(
        [uiText("reopenLastClosedTab_8743"), uiText("reopenLastClosedTab_a55b")],
        [uiText("switchTabs48ByPosition_df0c"), uiText("switchTabs_b153")],
        uiText("nextTab_2438"),
        uiText("previousTab_4c44"),
        [uiText("closeCurrentContentInClosingOrder_c9e7"), uiText("closeInClosingOrder_ef46")],
        [uiText("closeWindowMacos_f73b"), uiText("closeWindow_3601")],
      ),
    },
    {
      id: "find",
      title: uiText("find_dc5d"),
      items: take(
        uiText("findInNote_fc76"),
        uiText("replaceInNote_a796"),
        uiText("findNext_d7b5"),
        uiText("findPrevious_9594"),
        [uiText("findNextF3_025b"), uiText("findNext_a355")],
        uiText("findPrevious_4365"),
      ),
    },
    {
      id: "writing",
      title: uiText("edit_95b3"),
      items: take(
        [uiText("saveManuallyWriteLocalFilesTo_a7bc"), uiText("save_be5f")],
        uiText("bold_3b8a"),
        uiText("italic_81d6"),
        uiText("underline_f6f8"),
        uiText("inlineCode_a7aa"),
        uiText("strikethrough_a120"),
        uiText("headingLevels13_a78b"),
        uiText("moveBlockUp_9b50"),
        uiText("moveBlockDown_549f"),
        [uiText("addSelectionToAiConversationWhen_fdd9"), uiText("addToAiConversation_3c5e")],
        uiText("selectAll_66ee"),
        uiText("undo_bd9f"),
        uiText("redo_c3c8"),
        [uiText("redoWindows_72a1"), uiText("redo_c3c8")],
        uiText("increaseFontSize_6121"),
        uiText("decreaseFontSize_2b2b"),
        uiText("resetFontSize_bf64"),
      ),
    },
    {
      id: "files",
      title: uiText("localFiles_7cfa"),
      items: take(
        [uiText("moveLocalFileOrFolder_3209"), uiText("moveFileOrFolder_5eee")],
        [uiText("openCurrentLocalFileInAn_57e5"), uiText("openInAnotherApp_1d93")],
        [uiText("showCurrentLocalFileInFile_7d91"), uiText("showInFileManager_235d")],
        [uiText("openCurrentLocalFileInTerminal_d5cd"), uiText("openInTerminal_004c")],
        [uiText("copyCurrentFilePath_7dea"), uiText("copyFilePath_87f5")],
      ),
    },
  ].filter((group) => group.items.length > 0);
}

export function splitShortcutsForCurrentPlatform(): ShortcutGroupItem[] {
  return [
    [uiText("splitRight_8a36"), FIXED_SPLIT_SHORTCUTS.splitRight],
    [uiText("splitDown_f004"), FIXED_SPLIT_SHORTCUTS.splitDown],
    [uiText("focusLeft_4e1e"), FIXED_SPLIT_SHORTCUTS.splitFocusLeft],
    [uiText("focusRight_f580"), FIXED_SPLIT_SHORTCUTS.splitFocusRight],
    [uiText("focusAbove_e3a3"), FIXED_SPLIT_SHORTCUTS.splitFocusUp],
    [uiText("focusBelow_233a"), FIXED_SPLIT_SHORTCUTS.splitFocusDown],
    [uiText("previousSplit_9249"), FIXED_SPLIT_SHORTCUTS.splitFocusPrevious],
    [uiText("nextSplit_b54f"), FIXED_SPLIT_SHORTCUTS.splitFocusNext],
    [uiText("maximizeCurrentSplit_4a67"), FIXED_SPLIT_SHORTCUTS.splitZoom],
    [uiText("closeCurrentSplit_b27d"), FIXED_CLOSE_SHORTCUT],
  ]
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([label, shortcut]) => ({ label, shortcut }));
}
