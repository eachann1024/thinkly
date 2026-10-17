import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/SettingsAI.tsx#localMessages:1">`
zh-Hans:
  advancedOptions_1083: "高级选项"
  aiAssistant_318e: "AI 助手"
en:
  advancedOptions_1083: "Advanced options"
  aiAssistant_318e: "AI assistant"
`;
const uiText = createTranslator(localMessages);
import { Disclosure, DisclosureSummary } from "@/components/ui/disclosure";
import { type SettingsAIProps } from "./settings-ai/shared";
import { useAISettingsDraft } from "./settings-ai/useAISettingsDraft";
import { useAIProviderConnection } from "./settings-ai/useAIProviderConnection";
import { useAIConnectionTest } from "./settings-ai/useAIConnectionTest";
import { useAIModelRefresh } from "./settings-ai/useAIModelRefresh";
import { renderAIEnabledSection } from "./settings-ai/renderAIEnabledSection";
import { renderAIModelSection } from "./settings-ai/renderAIModelSection";
import { renderAIContextSection } from "./settings-ai/renderAIContextSection";
import { renderAIServiceSection } from "./settings-ai/renderAIServiceSection";
import { renderAIConnectionTestSection } from "./settings-ai/renderAIConnectionTestSection";

export function SettingsAI(props: SettingsAIProps) {
  const draft = useAISettingsDraft(props);
  const provider = useAIProviderConnection(draft);
  const connectionTest = useAIConnectionTest(provider);
  const aIModelRefreshContext = useAIModelRefresh(connectionTest);
  const context = aIModelRefreshContext;
  const { isOnboarding } = context;

  const enabledSection = renderAIEnabledSection(context);

  const modelSection = renderAIModelSection(context);

  const contextSection = renderAIContextSection(context);

  const serviceSection = renderAIServiceSection(context);

  const connectionTestSection = renderAIConnectionTestSection(context);

  if (isOnboarding) {
    return (
      <div className="mx-auto w-full max-w-xl space-y-3">
        {enabledSection}
        {serviceSection}
        {modelSection}
        {connectionTestSection}
        <Disclosure className="rounded-lg border border-border bg-background/50 p-3">
          <DisclosureSummary className="cursor-pointer text-sm font-medium text-foreground ">
            {uiText("advancedOptions_1083")}</DisclosureSummary>
          <div className="pt-3">{contextSection}</div>
        </Disclosure>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold tracking-tight text-foreground">
        {uiText("aiAssistant_318e")}</h3>
      <div className="settings-card-columns">
        <div className="space-y-5">
          {enabledSection}
          {modelSection}
          {contextSection}
        </div>
        <div className="space-y-5">{serviceSection}</div>
      </div>
    </div>
  );
}
