import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/appearance-settings/SidebarDisplaySettings.tsx#localMessages:1">`
zh-Hans:
  sidebar_63f4: "侧栏"
  showFolderCounts_f654: "显示文件夹数量"
en:
  sidebar_63f4: "Sidebar"
  showFolderCounts_f654: "Show folder counts"
`;
const uiText = createTranslator(localMessages);
import * as GooseIcons from "@/components/ui/icons";
import { Switch, SwitchRow } from "@/components/ui/switch";
import { useSettings } from "@/stores/useSettings";
import { SettingsSectionCard } from "../settings/SettingsSectionCard";
import { APPEARANCE_OPTION_ROW_CLASS } from "./shared";

const SWITCH_CLASS = "data-[state=unchecked]:bg-[hsl(var(--foreground)/0.12)]";

export function SidebarDisplaySettings() {
  useLocale();
  const enabled = useSettings((state) => state.showSidebarFolderCount);
  const setEnabled = useSettings((state) => state.setShowSidebarFolderCount);
  return (
    <SettingsSectionCard title={uiText("sidebar_63f4")}>
      <SwitchRow className={`flex items-center justify-between gap-4 p-4 ${APPEARANCE_OPTION_ROW_CLASS}`}>
        <span className="flex items-center gap-3">
          <GooseIcons.Folder className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="text-sm font-medium leading-none">{uiText("showFolderCounts_f654")}</span>
        </span>
        <Switch id="sidebar-folder-count" checked={enabled} onCheckedChange={setEnabled} className={SWITCH_CLASS} />
      </SwitchRow>
    </SettingsSectionCard>
  );
}
