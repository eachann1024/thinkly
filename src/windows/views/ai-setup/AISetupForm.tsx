import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AuxiliaryAISetupConfig } from "@/lib/auxiliary-window/contract";
import { resolveProtocolForProvider } from "@/lib/ai-provider";
import type { SetupGuideAIStatus } from "@/lib/setupGuideAI";
import { SettingsAI } from "@/pages/workspace/components/sidebar/SettingsAI";
import { readStoredApiKey, readStoredBaseURL } from "@/pages/workspace/components/sidebar/settings-ai/shared";
import type { AISettings } from "@/stores/useSettings";
import { uiText } from "./messages";
import { useAISetupDraft } from "./useAISetupDraft";

export function AISetupForm({
  settings,
  onSave,
  onLater,
  onOpenSettings,
  saving,
}: {
  settings: AISettings;
  onSave: (config: AuxiliaryAISetupConfig) => void;
  onLater: () => void;
  onOpenSettings: () => void;
  saving: boolean;
}) {
  const draft = useAISetupDraft(settings);
  const [status, setStatus] = useState<SetupGuideAIStatus | null>(null);
  const saveDisabled = saving || !status?.ready || status.busy || status.dirty;

  const save = () => {
    if (saveDisabled || !draft.ai.selectedModelId) return;
    const protocol = resolveProtocolForProvider(
      draft.ai.customProviderId,
      draft.ai.selectedModelId,
      draft.ai.customProtocol,
    );
    onSave({
      providerId: draft.ai.customProviderId,
      protocol,
      baseURL: readStoredBaseURL(draft.ai, draft.ai.customProviderId, protocol),
      apiKey: readStoredApiKey(draft.ai, draft.ai.customProviderId, protocol),
      modelOptions: draft.ai.customModelOptions,
      selectedModelId: draft.ai.selectedModelId,
      enabled: true,
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
          <p className="text-[13px] leading-5 text-muted-foreground">{uiText("intro")}</p>
          <SettingsAI
            mode="onboarding"
            ai={draft.ai}
            enabled
            setEnabled={draft.setEnabled}
            setReadGlobalPrompt={draft.setReadGlobalPrompt}
            setReadLocalSkills={draft.setReadLocalSkills}
            selectedModelId={draft.ai.selectedModelId}
            setSelectedModelId={draft.setSelectedModelId}
            saveCustomConfig={draft.saveCustomConfig}
            onSetupStateChange={setStatus}
          />
        </div>
      </div>
      <footer className="flex shrink-0 items-center gap-2 border-t border-border px-4 py-3">
        <Button type="button" variant="ghost" size="sm" onClick={onOpenSettings}>
          {uiText("openSettings")}
        </Button>
        <span className="flex-1" />
        <Button type="button" variant="outline" size="sm" onClick={onLater}>
          {uiText("later")}
        </Button>
        <Button type="button" size="sm" disabled={saveDisabled} onClick={save}>
          {uiText("save")}
        </Button>
      </footer>
    </div>
  );
}
