import * as GooseIcons from "@/components/ui/icons";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import { normalizeEditorGridMode } from "@/lib/editorCanvas";
import { useSettings } from "@/stores/useSettings";
import { SettingsSectionCard } from "../settings/SettingsSectionCard";
import { APPEARANCE_OPTION_ROW_CLASS } from "./shared";

const SWITCH_CLASS = "data-[state=unchecked]:bg-[hsl(var(--foreground)/0.12)]";
const GRID_OPTIONS = [
  { value: "off", label: "无" },
  { value: "grid", label: "方格" },
  { value: "dots", label: "点阵" },
];

export function CanvasSettings() {
  const editorGridMode = useSettings((state) => state.editorGridMode);
  const setEditorGridMode = useSettings((state) => state.setEditorGridMode);
  const sidebarTint = useSettings((state) => state.sidebarTint);
  const setSidebarTint = useSettings((state) => state.setSidebarTint);
  return (
    <SettingsSectionCard title="画布">
      <div className={`flex items-center justify-between gap-4 p-4 ${APPEARANCE_OPTION_ROW_CLASS}`}>
        <div className="flex items-center gap-3">
          <GooseIcons.Table2 className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span id="editor-grid-mode-label" className="text-sm font-medium">编辑器网格</span>
        </div>
        <SegmentedControl
          aria-labelledby="editor-grid-mode-label"
          options={GRID_OPTIONS}
          value={normalizeEditorGridMode(editorGridMode)}
          onValueChange={(value) => setEditorGridMode(normalizeEditorGridMode(value))}
        />
      </div>
      <div className={`mt-2 flex items-center justify-between gap-4 p-4 ${APPEARANCE_OPTION_ROW_CLASS}`}>
        <div className="flex items-center gap-3">
          <GooseIcons.PanelLeft className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <Label htmlFor="sidebar-tint" className="cursor-pointer">彩色侧栏</Label>
        </div>
        <Switch id="sidebar-tint" checked={sidebarTint} onCheckedChange={setSidebarTint} className={SWITCH_CLASS} />
      </div>
    </SettingsSectionCard>
  );
}
