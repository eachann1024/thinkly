import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings-ai/renderAIEnabledSection.tsx#localMessages:1">`
zh-Hans:
  enableAiAssistant_c698: "启用 AI 助手"
  turningThisOffStopsAnyResponse_42a7: "关闭会停止正在生成的回答。"
en:
  enableAiAssistant_c698: "Enable AI assistant"
  turningThisOffStopsAnyResponse_42a7: "Turning this off stops any response being generated."
ja:
  enableAiAssistant_c698: "AI アシスタントを有効にする"
  turningThisOffStopsAnyResponse_42a7: "オフにすると、生成中の回答が停止します。"
`;
const uiText = createTranslator(localMessages);
import * as GooseIcons from "@/components/ui/icons";
import type { useAIModelRefresh } from "./useAIModelRefresh";
import { ModuleActivation, ModuleEnabledRow } from "../settings/ModuleActivation";
import { DotDecor } from "@/components/ui/dot-matrix";
import { DotMatrixSparkle } from "./DotMatrixSparkle";

export function renderAIEnabledSection(
  context: ReturnType<typeof useAIModelRefresh>,
) {
  const { enabled, setEnabled, isOnboarding } = context;
  return (
    <ModuleEnabledRow
      id="ai-enabled"
      icon={GooseIcons.Sparkles}
      label={uiText("enableAiAssistant_c698")}
      description={uiText("turningThisOffStopsAnyResponse_42a7")}
      checked={enabled}
      onCheckedChange={setEnabled}
      cardClassName={isOnboarding ? "p-4" : undefined}
      contentClassName={isOnboarding ? "space-y-3" : undefined}
    />
  );
}

export function AIActivationView({ onEnable }: { onEnable: () => void }) {
  useLocale();
  return (
    <ModuleActivation
      icon={GooseIcons.Sparkles}
      label={uiText("enableAiAssistant_c698")}
      onEnable={onEnable}
      illustration={<DotMatrixSparkle className="block shrink-0 text-foreground" />}
      decoration={<DotDecor preset="aiGate" />}
    />
  );
}
