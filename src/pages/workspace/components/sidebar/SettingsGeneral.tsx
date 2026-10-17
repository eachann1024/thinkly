import { i18nYaml, useMessages } from "@/i18n";
import { SettingsLanguage } from "./settings/SettingsLanguage";
import { useWorkspaceViewport } from "@/stores/useWorkspaceViewport";
import { Switch, SwitchRow } from "@/components/ui/switch";
import * as GooseIcons from "@/components/ui/icons";
import { SettingsSectionCard } from "./settings/SettingsSectionCard";
import { SettingsAppUpdate } from "./settings/SettingsAppUpdate";

const messages = i18nYaml<"src/pages/workspace/components/sidebar/SettingsGeneral.tsx#messages:1">`
zh-Hans:
  general: 通用
  common: 常用设置
  autoOpen: 启动时打开上次的笔记
  hover: 悬停展开笔记本菜单
  search: 搜索
  recent: 搜索时显示最近访问的笔记
en:
  general: General
  common: General settings
  autoOpen: Open the last note on startup
  hover: Open the notebook menu on hover
  search: Search
  recent: Show recent notes in search
`;

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
  const t = useMessages(messages);
  const forceCollapseLeft = useWorkspaceViewport((state) => state.forceCollapseLeft);
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold tracking-tight text-foreground">{t("general")}</h3>
      <div className="space-y-5">
        <SettingsSectionCard title={t("common")}>
          <SettingsLanguage />
          <SwitchRow className={`flex items-center justify-between gap-4 p-4 ${ROW_CLASS}`}>
            <span className="flex items-center gap-3">
              <GooseIcons.FileClock className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
              <span className="text-sm font-medium leading-none">{t("autoOpen")}</span>
            </span>
            <Switch id="auto-open-last-note" checked={autoOpenLastNote} onCheckedChange={setAutoOpenLastNote} className={SWITCH_CLASS} />
          </SwitchRow>
          <SwitchRow className={`mt-2 flex items-center justify-between gap-4 p-4 ${ROW_CLASS}`}>
            <span className="flex items-center gap-3">
              <GooseIcons.MousePointer2 className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
              <span className="text-sm font-medium leading-none">{t("hover")}</span>
            </span>
            <Switch id="notebook-hover-expand" disabled={forceCollapseLeft} checked={notebookDropdownHoverExpand && !forceCollapseLeft} onCheckedChange={setNotebookDropdownHoverExpand} className={SWITCH_CLASS} />
          </SwitchRow>
        </SettingsSectionCard>
        <SettingsSectionCard title={t("search")}>
          <SwitchRow className={`flex items-center justify-between gap-4 p-4 ${ROW_CLASS}`}>
            <span className="flex items-center gap-3">
              <GooseIcons.History className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
              <span className="text-sm font-medium leading-none">{t("recent")}</span>
            </span>
            <Switch id="show-recent-in-search" checked={showRecentInSearch} onCheckedChange={setShowRecentInSearch} className={SWITCH_CLASS} />
          </SwitchRow>
        </SettingsSectionCard>
        <SettingsAppUpdate />
      </div>
    </div>
  );
}
