import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/SettingsShortcuts.tsx#localMessages:1">`
zh-Hans:
  keyboardShortcuts_f7d2: "快捷键"
  clickAgainToConfirmReset_50cc: "再次点击确认恢复"
  resetToDefaults_7468: "恢复默认"
en:
  keyboardShortcuts_f7d2: "Keyboard shortcuts"
  clickAgainToConfirmReset_50cc: "Click again to confirm reset"
  resetToDefaults_7468: "Reset to defaults"
`;
const uiText = createTranslator(localMessages);
import { renderShortcutSettingsColumns } from "./shortcut-settings/renderShortcutSettingsColumns";
import { Button } from "@/components/ui/button";
import { type SettingsShortcutsProps } from "./shortcut-settings/shared";
import { useShortcutSettings } from "./shortcut-settings/useShortcutSettings";

export function SettingsShortcuts(props: SettingsShortcutsProps) {
  const shortcutSettingsContext = useShortcutSettings(props);
  const context = shortcutSettingsContext;
  const { confirmReset, setConfirmReset, handleReset } = context;

  return (
    <div className="settings-shortcuts">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-xl font-semibold tracking-tight text-foreground">
          {uiText("keyboardShortcuts_f7d2")}</h3>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 rounded-[var(--goose-control-radius)]"
          onClick={handleReset}
          onBlur={() => setConfirmReset(false)}
        >
          {confirmReset ? uiText("clickAgainToConfirmReset_50cc") : uiText("resetToDefaults_7468")}
        </Button>
      </div>

      {renderShortcutSettingsColumns(context)}
    </div>
  );
}
