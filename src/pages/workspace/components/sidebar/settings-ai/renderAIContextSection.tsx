import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings-ai/renderAIContextSection.tsx#localMessages:1">`
zh-Hans:
  promptsAndSkills_aace: "提示词与技能"
  whenEnabledRelevantLocalContentIs_8628: "开启后，相关本地内容会随对话发送给 AI 服务商。"
  readGlobalPrompts_1b07: "读取全局提示词"
  readLocalSkills_b400: "读取本地技能 (Skills)"
en:
  promptsAndSkills_aace: "Prompts and skills"
  whenEnabledRelevantLocalContentIs_8628: "When enabled, relevant local content is sent to the AI provider with your conversation."
  readGlobalPrompts_1b07: "Read global prompts"
  readLocalSkills_b400: "Read local skills"
`;
const uiText = createTranslator(localMessages);
import * as GooseIcons from "@/components/ui/icons";
import { Switch, SwitchRow } from "@/components/ui/switch";
import { SettingsSectionCard } from "../settings/SettingsSectionCard";
import { cn } from "@/lib/utils";
import type { useAIModelRefresh } from "./useAIModelRefresh";
import type { AIContextAvailability } from "./useAIContextAvailability";
import { SETTINGS_OPTION_ROW_CLASS } from "./shared";

export function renderAIContextSection(
  context: ReturnType<typeof useAIModelRefresh>,
  { hasGlobalPrompt, hasLocalSkills }: AIContextAvailability,
) {
  const { ai, setReadGlobalPrompt, setReadLocalSkills, isOnboarding } = context;
  if (!hasGlobalPrompt && !hasLocalSkills) return null;
  return (
    <SettingsSectionCard
      className={isOnboarding ? "p-4" : undefined}
      title={
        <span className="flex items-center gap-2">
          <GooseIcons.FolderCog
            className="h-4 w-4 shrink-0 text-muted-foreground"
            strokeWidth={1.75}
          />
          {uiText("promptsAndSkills_aace")}
        </span>
      }
      description={uiText("whenEnabledRelevantLocalContentIs_8628")}
    >
      <div className="space-y-2">
        {hasGlobalPrompt && (
          <SwitchRow
            className={cn(
              "flex items-center justify-between gap-4 p-4",
              SETTINGS_OPTION_ROW_CLASS,
            )}
          >
            <span className="block space-y-1">
              <span
                className="text-sm font-medium leading-none text-foreground"
              >
                {uiText("readGlobalPrompts_1b07")}
              </span>
            </span>
            <Switch
              id="ai-read-global-prompt"
              checked={ai.readGlobalPrompt}
              onCheckedChange={setReadGlobalPrompt}
            />
          </SwitchRow>
        )}
        {hasLocalSkills && (
          <SwitchRow
            className={cn(
              "flex items-center justify-between gap-4 p-4",
              SETTINGS_OPTION_ROW_CLASS,
            )}
          >
            <span className="block space-y-1">
              <span
                className="text-sm font-medium leading-none text-foreground"
              >
                {uiText("readLocalSkills_b400")}
              </span>
            </span>
            <Switch
              id="ai-read-local-skills"
              checked={ai.readLocalSkills}
              onCheckedChange={setReadLocalSkills}
            />
          </SwitchRow>
        )}
      </div>
    </SettingsSectionCard>
  );
}
