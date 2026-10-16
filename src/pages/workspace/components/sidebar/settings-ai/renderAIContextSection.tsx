import * as GooseIcons from "@/components/ui/icons";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SettingsSectionCard } from "../settings/SettingsSectionCard";
import { cn } from "@/lib/utils";
import type { useAIModelRefresh } from "./useAIModelRefresh";
import { SETTINGS_OPTION_ROW_CLASS } from "./shared";

export function renderAIContextSection(
  context: ReturnType<typeof useAIModelRefresh>,
) {
  const { ai, setReadGlobalPrompt, setReadLocalSkills, isOnboarding } = context;
  return (
    <SettingsSectionCard
      className={isOnboarding ? "p-4" : undefined}
      title={
        <span className="flex items-center gap-2">
          <GooseIcons.FolderCog
            className="h-4 w-4 shrink-0 text-muted-foreground"
            strokeWidth={1.75}
          />
          提示词与技能
        </span>
      }
      description="开启后，相关本地内容会随对话发送给 AI 服务商。"
    >
      <div className="space-y-2">
        <div
          className={cn(
            "flex items-center justify-between gap-4 p-4",
            SETTINGS_OPTION_ROW_CLASS,
          )}
        >
          <div className="space-y-1">
            <Label
              htmlFor="ai-read-global-prompt"
              className="cursor-pointer text-sm font-medium text-foreground"
            >
              读取全局提示词
            </Label>
          </div>
          <Switch
            id="ai-read-global-prompt"
            checked={ai.readGlobalPrompt}
            onCheckedChange={setReadGlobalPrompt}
          />
        </div>
        <div
          className={cn(
            "flex items-center justify-between gap-4 p-4",
            SETTINGS_OPTION_ROW_CLASS,
          )}
        >
          <div className="space-y-1">
            <Label
              htmlFor="ai-read-local-skills"
              className="cursor-pointer text-sm font-medium text-foreground"
            >
              读取本地技能 (Skills)
            </Label>
          </div>
          <Switch
            id="ai-read-local-skills"
            checked={ai.readLocalSkills}
            onCheckedChange={setReadLocalSkills}
          />
        </div>
      </div>
    </SettingsSectionCard>
  );
}
