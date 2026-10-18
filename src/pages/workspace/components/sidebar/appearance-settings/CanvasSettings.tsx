import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/appearance-settings/CanvasSettings.tsx#localMessages:1">`
zh-Hans:
  none_d81b: "无"
  grid_5340: "方格"
  dots_f4a6: "点阵"
  canvas_4d7f: "画布"
  editorGrid_47a6: "编辑器网格"
en:
  none_d81b: "None"
  grid_5340: "Grid"
  dots_f4a6: "Dots"
  canvas_4d7f: "Canvas"
  editorGrid_47a6: "Editor grid"
ja:
  none_d81b: "なし"
  grid_5340: "グリッド"
  dots_f4a6: "ドット"
  canvas_4d7f: "キャンバス"
  editorGrid_47a6: "エディタのグリッド"
`;
const uiText = createTranslator(localMessages);
import * as GooseIcons from "@/components/ui/icons";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { normalizeEditorGridMode } from "@/lib/editorCanvas";
import { useSettings } from "@/stores/useSettings";
import { SettingsSectionCard } from "../settings/SettingsSectionCard";
import { APPEARANCE_OPTION_ROW_CLASS } from "./shared";

const GRID_OPTIONS = [
  { value: "off", get label() { return uiText("none_d81b"); } },
  { value: "grid", get label() { return uiText("grid_5340"); } },
  { value: "dots", get label() { return uiText("dots_f4a6"); } },
];

export function CanvasSettings() {
  useLocale();
  const editorGridMode = useSettings((state) => state.editorGridMode);
  const setEditorGridMode = useSettings((state) => state.setEditorGridMode);
  return (
    <SettingsSectionCard title={uiText("canvas_4d7f")}>
      <div className={`flex items-center justify-between gap-3 ${APPEARANCE_OPTION_ROW_CLASS}`}>
        <div className="flex items-center gap-3">
          <GooseIcons.Table2 className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span id="editor-grid-mode-label" className="text-sm font-medium leading-5">{uiText("editorGrid_47a6")}</span>
        </div>
        <SegmentedControl
          aria-labelledby="editor-grid-mode-label"
          options={GRID_OPTIONS}
          value={normalizeEditorGridMode(editorGridMode)}
          onValueChange={(value) => setEditorGridMode(normalizeEditorGridMode(value))}
        />
      </div>
    </SettingsSectionCard>
  );
}
