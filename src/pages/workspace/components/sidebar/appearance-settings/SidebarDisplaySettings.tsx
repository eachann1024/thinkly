import * as GooseIcons from "@/components/ui/icons";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/stores/useSettings";
import { SettingsSectionCard } from "../settings/SettingsSectionCard";
import { APPEARANCE_OPTION_ROW_CLASS } from "./shared";

const SWITCH_CLASS = "data-[state=unchecked]:bg-[hsl(var(--foreground)/0.12)]";

export function SidebarDisplaySettings() {
  const enabled = useSettings((state) => state.showSidebarFolderCount);
  const setEnabled = useSettings((state) => state.setShowSidebarFolderCount);
  return (
    <SettingsSectionCard title="侧栏">
      <div className={`flex items-center justify-between gap-4 p-4 ${APPEARANCE_OPTION_ROW_CLASS}`}>
        <div className="flex items-center gap-3">
          <GooseIcons.Folder className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <Label htmlFor="sidebar-folder-count" className="cursor-pointer">显示文件夹数量</Label>
        </div>
        <Switch id="sidebar-folder-count" checked={enabled} onCheckedChange={setEnabled} className={SWITCH_CLASS} />
      </div>
    </SettingsSectionCard>
  );
}
