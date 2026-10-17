import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings-ai/renderAIEnabledSection.tsx#localMessages:1">`
zh-Hans:
  enableAiAssistant_c698: "启用 AI 助手"
  turningThisOffStopsAnyResponse_42a7: "关闭会停止正在生成的回答。"
en:
  enableAiAssistant_c698: "Enable AI assistant"
  turningThisOffStopsAnyResponse_42a7: "Turning this off stops any response being generated."
`;
const uiText = createTranslator(localMessages);
import * as GooseIcons from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Switch, SwitchRow } from "@/components/ui/switch";
import { SettingsSectionCard } from "../settings/SettingsSectionCard";
import { cn } from "@/lib/utils";
import type { useAIModelRefresh } from "./useAIModelRefresh";
import { SETTINGS_OPTION_ROW_CLASS } from "./shared";

export function renderAIEnabledSection(
  context: ReturnType<typeof useAIModelRefresh>,
) {
  const { enabled, setEnabled, isOnboarding } = context;
  return (
    <SettingsSectionCard
      className={isOnboarding ? "p-4" : undefined}
      contentClassName={isOnboarding ? "space-y-3" : undefined}
    >
      <SwitchRow
        className={cn(
          "flex items-center justify-between gap-4 p-4",
          SETTINGS_OPTION_ROW_CLASS,
        )}
      >
        <span className="block space-y-1.5">
          <span className="flex items-center gap-2">
            <GooseIcons.Sparkles className="h-4 w-4 text-current" />
            <span
              className="text-sm font-medium leading-none text-foreground"
            >
              {uiText("enableAiAssistant_c698")}
            </span>
          </span>
          <span className="block text-sm leading-relaxed text-muted-foreground">
            {uiText("turningThisOffStopsAnyResponse_42a7")}
          </span>
        </span>
        <Switch
          id="ai-enabled"
          checked={enabled}
          onCheckedChange={setEnabled}
        />
      </SwitchRow>
    </SettingsSectionCard>
  );
}

export function AIActivationView({ onEnable }: { onEnable: () => void }) {
  return (
    <section className="flex min-h-64 flex-col items-center justify-center gap-6 px-4 py-8">
      <GooseIcons.Sparkles
        className="h-8 w-8 text-muted-foreground"
        aria-hidden
      />
      <Button type="button" onClick={onEnable}>
        {uiText("enableAiAssistant_c698")}
        <GooseIcons.ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
    </section>
  );
}
