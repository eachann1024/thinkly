import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";
import { Switch, SwitchRow } from "@/components/ui/switch";
import { isReflectionAiConsented, useReflection } from "@/stores/useReflection";
import { useSettings } from "@/stores/useSettings";
import { cn } from "@/lib/utils";
import { SettingsSectionCard } from "../settings/SettingsSectionCard";
import { SETTINGS_OPTION_ROW_CLASS } from "./shared";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings-ai/renderReflectionSection.tsx#localMessages:1">`
zh-Hans:
  weeklyReflection: "反思"
  sendLastWeekNotes: "允许把反思范围内笔记的标题和摘要发送给 AI，用于生成反思"
en:
  weeklyReflection: "Reflection"
  sendLastWeekNotes: "Allow sending the titles and excerpts of the notes in the reflection range to the AI to write the reflection"
ja:
  weeklyReflection: "振り返り"
  sendLastWeekNotes: "振り返り期間内のノートのタイトルと要約を、振り返りの生成のために AI へ送信することを許可します"
`;
const uiText = createTranslator(localMessages);

export function ReflectionAISection() {
  useLocale();
  const aiEnabled = useSettings((s) => s.ai.enabled);
  const aiConsent = useReflection((s) => isReflectionAiConsented(s, aiEnabled));
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
