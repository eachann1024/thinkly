import { createTranslator } from "@/i18n";
import localMessages from "./shortcutGroups.messages.yaml";

const uiText = createTranslator(localMessages);
import { layoutText } from "@/lib/editor-split/layoutLabels";
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

function shortcutItems(
  entries: Array<[string, string]>,
): ShortcutGroupItem[] {
  return entries
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([label, shortcut]) => ({ label, shortcut }));
}

export function splitShortcutsForCurrentPlatform(): ShortcutGroupItem[] {
  return shortcutItems([
    [uiText("splitRight_8a36"), FIXED_SPLIT_SHORTCUTS.splitRight],
    [uiText("splitDown_f004"), FIXED_SPLIT_SHORTCUTS.splitDown],
    [uiText("maximizeCurrentSplit_4a67"), FIXED_SPLIT_SHORTCUTS.splitZoom],
    [layoutText("maximize"), FIXED_SPLIT_SHORTCUTS.splitMaximize],
    [layoutText("equalize"), FIXED_SPLIT_SHORTCUTS.splitEqualize],
    [uiText("closeCurrentSplit_b27d"), FIXED_CLOSE_SHORTCUT],
  ]);
}

export function advancedSplitShortcutsForCurrentPlatform(): ShortcutGroupItem[] {
  return shortcutItems([
    [uiText("focusLeft_4e1e"), FIXED_SPLIT_SHORTCUTS.splitFocusLeft],
    [uiText("focusRight_f580"), FIXED_SPLIT_SHORTCUTS.splitFocusRight],
    [uiText("focusAbove_e3a3"), FIXED_SPLIT_SHORTCUTS.splitFocusUp],
    [uiText("focusBelow_233a"), FIXED_SPLIT_SHORTCUTS.splitFocusDown],
    [layoutText("moveLeft"), FIXED_SPLIT_SHORTCUTS.splitMoveLeft],
    [layoutText("moveRight"), FIXED_SPLIT_SHORTCUTS.splitMoveRight],
    [layoutText("moveUp"), FIXED_SPLIT_SHORTCUTS.splitMoveUp],
    [layoutText("moveDown"), FIXED_SPLIT_SHORTCUTS.splitMoveDown],
    [uiText("previousSplit_9249"), FIXED_SPLIT_SHORTCUTS.splitFocusPrevious],
    [uiText("nextSplit_b54f"), FIXED_SPLIT_SHORTCUTS.splitFocusNext],
  ]);
}
