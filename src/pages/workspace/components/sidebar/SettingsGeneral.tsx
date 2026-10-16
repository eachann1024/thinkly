import { useWorkspaceViewport } from "@/stores/useWorkspaceViewport";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import * as GooseIcons from "@/components/ui/icons";
import { SettingsSectionCard } from "./settings/SettingsSectionCard";
import { SettingsAppUpdate } from "./settings/SettingsAppUpdate";

interface SettingsGeneralProps {
  autoOpenLastNote: boolean;
  setAutoOpenLastNote: (enabled: boolean) => void;
  showRecentInSearch: boolean;
  setShowRecentInSearch: (enabled: boolean) => void;
  notebookDropdownHoverExpand: boolean;
  setNotebookDropdownHoverExpand: (enabled: boolean) => void;
}

const ROW_CLASS = "goose-settings-option-row";
const SWITCH_CLASS = "data-[state=unchecked]:bg-[hsl(var(--foreground)/0.12)]";

export function SettingsGeneral({
  autoOpenLastNote, setAutoOpenLastNote,
  showRecentInSearch, setShowRecentInSearch,
  notebookDropdownHoverExpand, setNotebookDropdownHoverExpand,
}: SettingsGeneralProps) {
  const forceCollapseLeft = useWorkspaceViewport((state) => state.forceCollapseLeft);
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold tracking-tight text-foreground">通用</h3>
      <div className="space-y-5">
        <SettingsSectionCard title="常用设置">
          <div className={`flex items-center justify-between gap-4 p-4 ${ROW_CLASS}`}>
            <div className="flex items-center gap-3">
              <GooseIcons.FileClock className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
              <Label htmlFor="auto-open-last-note" className="cursor-pointer">启动时打开上次的笔记</Label>
            </div>
            <Switch id="auto-open-last-note" checked={autoOpenLastNote} onCheckedChange={setAutoOpenLastNote} className={SWITCH_CLASS} />
          </div>
          <div className={`mt-2 flex items-center justify-between gap-4 p-4 ${ROW_CLASS}`}>
            <div className="flex items-center gap-3">
              <GooseIcons.MousePointer2 className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
              <Label htmlFor="notebook-hover-expand" className="cursor-pointer">悬停展开笔记本菜单</Label>
            </div>
            <Switch id="notebook-hover-expand" disabled={forceCollapseLeft} checked={notebookDropdownHoverExpand && !forceCollapseLeft} onCheckedChange={setNotebookDropdownHoverExpand} className={SWITCH_CLASS} />
          </div>
        </SettingsSectionCard>
        <SettingsSectionCard title="搜索">
          <div className={`flex items-center justify-between gap-4 p-4 ${ROW_CLASS}`}>
            <div className="flex items-center gap-3">
              <GooseIcons.History className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
              <Label htmlFor="show-recent-in-search" className="cursor-pointer">搜索时显示最近访问的笔记</Label>
            </div>
            <Switch id="show-recent-in-search" checked={showRecentInSearch} onCheckedChange={setShowRecentInSearch} className={SWITCH_CLASS} />
          </div>
        </SettingsSectionCard>
        <SettingsAppUpdate />
      </div>
    </div>
  );
}
