import { createTranslator, i18nYaml } from "@/i18n";
import { Switch, SwitchRow } from "@/components/ui/switch";
import { useReflection } from "@/stores/useReflection";
import { cn } from "@/lib/utils";
import { SettingsSectionCard } from "../settings/SettingsSectionCard";
import { SETTINGS_OPTION_ROW_CLASS } from "./shared";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings-ai/renderReflectionSection.tsx#localMessages:1">`
zh-Hans:
  weeklyReflection: "每周反思"
  sendLastWeekNotes: "允许把上周笔记的标题和摘要发送给 AI，用于生成每周反思"
en:
  weeklyReflection: "Weekly reflection"
  sendLastWeekNotes: "Allow sending the titles and excerpts of last week's notes to the AI to write the weekly reflection"
`;
const uiText = createTranslator(localMessages);

export function ReflectionAISection() {
  const aiConsent = useReflection((s) => s.aiConsent);
  const setAiConsent = useReflection((s) => s.setAiConsent);
  return (
    <SettingsSectionCard title={uiText("weeklyReflection")}>
      <SwitchRow className={cn("flex items-center justify-between gap-4 p-4", SETTINGS_OPTION_ROW_CLASS)}>
        <span className="block text-sm font-medium text-foreground">{uiText("sendLastWeekNotes")}</span>
        <Switch id="ai-weekly-reflection" checked={aiConsent} onCheckedChange={setAiConsent} />
      </SwitchRow>
    </SettingsSectionCard>
  );
}
