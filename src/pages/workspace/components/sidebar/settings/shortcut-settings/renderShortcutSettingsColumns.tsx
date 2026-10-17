import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/shortcut-settings/renderShortcutSettingsColumns.tsx#localMessages:1">`
zh-Hans:
  showOrHideSidebar_b51d: "显示或隐藏侧栏"
  showOrHideAiAssistant_1192: "显示或隐藏 AI 助手"
  openSearch_043f: "打开搜索"
  switchAppearance_f3b1: "切换外观"
  goBack_efa6: "返回上一处"
  goForward_0a13: "前往下一处"
  newTab_b52d: "新建标签页"
  inApp_ce8e: "应用内"
  splitView_37e2: "分屏"
  close_b15d: "关闭"
  closeCurrentSplitOrTab_1409: "关闭当前分屏或标签页"
  exitEditingSearchOrDialog_6898: "退出编辑、搜索或弹窗"
  builtInShortcuts_8754: "内置快捷键"
en:
  showOrHideSidebar_b51d: "Show or hide sidebar"
  showOrHideAiAssistant_1192: "Show or hide AI assistant"
  openSearch_043f: "Open search"
  switchAppearance_f3b1: "Switch appearance"
  goBack_efa6: "Go back"
  goForward_0a13: "Go forward"
  newTab_b52d: "New tab"
  inApp_ce8e: "In app"
  splitView_37e2: "Split view"
  close_b15d: "Close"
  closeCurrentSplitOrTab_1409: "Close current split or tab"
  exitEditingSearchOrDialog_6898: "Exit editing, search, or dialog"
  builtInShortcuts_8754: "Built-in shortcuts"
`;
const uiText = createTranslator(localMessages);
import { getPlatformKind } from "@/lib/utils";
import { DEFAULT_APP_SHORTCUTS } from "@/stores/useSettings";
import { SettingsSectionCard } from "../SettingsSectionCard";
import { ShortcutField } from "../ShortcutField";
import type { useShortcutSettings } from "./useShortcutSettings";
import { DesktopGlobalHotkeysCard } from "./shared";
import { FixedShortcutRow } from "./sections/ShortcutDisplay";
import {
  CollapsibleShortcutGroups,
  ShortcutReference,
} from "./sections/FixedShortcutGroups";
import {
  currentShortcutPlatform,
  fixedShortcutsForCurrentPlatform,
  splitShortcutsForCurrentPlatform,
} from "./sections/shortcutGroups";

export function renderShortcutSettingsColumns(
  context: ReturnType<typeof useShortcutSettings>,
) {
  const {
    closeTabShortcut,
    searchPanelCloseShortcut,
    appShortcuts,
    singleTabMode,
    safeSetAppShortcut,
  } = context;
  const platform = currentShortcutPlatform();
  const customFields = [
    ["toggleSidebar", "shortcut-toggle-sidebar", uiText("showOrHideSidebar_b51d")],
    ["toggleAIPanel", "shortcut-toggle-ai-panel", uiText("showOrHideAiAssistant_1192")],
    ["openSearch", "shortcut-open-search", uiText("openSearch_043f")],
    ["toggleTheme", "shortcut-toggle-theme", uiText("switchAppearance_f3b1")],
    ["navBack", "shortcut-nav-back", uiText("goBack_efa6")],
    ["navForward", "shortcut-nav-forward", uiText("goForward_0a13")],
    ...(!singleTabMode
      ? [["newTab", "shortcut-new-tab", uiText("newTab_b52d")] as const]
      : []),
  ] as const;

  return (
    <div className="settings-shortcuts-columns">
      <div className="space-y-6">
          <DesktopGlobalHotkeysCard
            appShortcuts={appShortcuts}
            closeTabShortcut={closeTabShortcut}
            searchPanelCloseShortcut={searchPanelCloseShortcut}
            singleTabMode={singleTabMode}
          />

        <SettingsSectionCard title={uiText("inApp_ce8e")}>
          <div className="space-y-3">
            {customFields.map(([id, fieldId, title]) => (
              <ShortcutField
                key={id}
                id={fieldId}
                title={title}
                value={appShortcuts[id] ?? DEFAULT_APP_SHORTCUTS[id]}
                onChange={safeSetAppShortcut(id)}
                resetValue={DEFAULT_APP_SHORTCUTS[id]}
              />
            ))}
          </div>
        </SettingsSectionCard>

        <SettingsSectionCard title={uiText("splitView_37e2")}>
          <ShortcutReference items={splitShortcutsForCurrentPlatform()} />
        </SettingsSectionCard>
      </div>

      <div className="space-y-6">
        <SettingsSectionCard title={uiText("close_b15d")}>
          <div className="space-y-1">
            <FixedShortcutRow
              label={uiText("closeCurrentSplitOrTab_1409")}
              shortcut={closeTabShortcut}
              platform={getPlatformKind()}
            />
            <FixedShortcutRow
              label={uiText("exitEditingSearchOrDialog_6898")}
              shortcut={searchPanelCloseShortcut}
              platform={platform}
            />
          </div>
        </SettingsSectionCard>

        <SettingsSectionCard title={uiText("builtInShortcuts_8754")}>
          <CollapsibleShortcutGroups
            groups={fixedShortcutsForCurrentPlatform(singleTabMode)}
          />
        </SettingsSectionCard>
      </div>
    </div>
  );
}
