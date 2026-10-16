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
    ["toggleSidebar", "shortcut-toggle-sidebar", "显示或隐藏侧栏"],
    ["toggleAIPanel", "shortcut-toggle-ai-panel", "显示或隐藏 AI 助手"],
    ["openSearch", "shortcut-open-search", "打开搜索"],
    ["toggleTheme", "shortcut-toggle-theme", "切换外观"],
    ["navBack", "shortcut-nav-back", "返回上一处"],
    ["navForward", "shortcut-nav-forward", "前往下一处"],
    ...(!singleTabMode
      ? [["newTab", "shortcut-new-tab", "新建标签页"] as const]
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

        <SettingsSectionCard title="应用内">
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

        <SettingsSectionCard title="分屏">
          <ShortcutReference items={splitShortcutsForCurrentPlatform()} />
        </SettingsSectionCard>
      </div>

      <div className="space-y-6">
        <SettingsSectionCard title="关闭">
          <div className="space-y-1">
            <FixedShortcutRow
              label="关闭当前分屏或标签页"
              shortcut={closeTabShortcut}
              platform={getPlatformKind()}
            />
            <FixedShortcutRow
              label="退出编辑、搜索或弹窗"
              shortcut={searchPanelCloseShortcut}
              platform={platform}
            />
          </div>
        </SettingsSectionCard>

        <SettingsSectionCard title="内置快捷键">
          <CollapsibleShortcutGroups
            groups={fixedShortcutsForCurrentPlatform(singleTabMode)}
          />
        </SettingsSectionCard>
      </div>
    </div>
  );
}
