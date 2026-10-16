import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { isSetupGuideVisible } from "@/lib/setupGuide";
import type { SetupGuideAIStatus } from "@/lib/setupGuideAI";
import { useSettings } from "@/stores/useSettings";
import { SettingsAI } from "./sidebar/SettingsAI";
import { readStoredApiKey } from "./sidebar/settings-ai/shared";
import { resolveProtocolForProvider } from "@/lib/ai-provider";
import "./writing-setup-prompt.css";

const NOTICE_ID = "ai-writing-assistant";

function openAISettings() {
  window.dispatchEvent(
    new CustomEvent("goose-note:open-settings", {
      detail: { tab: "ai" },
    }),
  );
}

/** 复用设置表单与保存流程，首次配置在独立对话框内完成。 */
export function AIFeatureNotice() {
  const dismissed = useSettings((s) => s.dismissedNotices[NOTICE_ID] === true);
  const hydrated = useSettings((s) => s._hasHydrated === true);
  const guideVisible = useSettings((s) => isSetupGuideVisible(s));
  const dismissNotice = useSettings((s) => s.dismissNotice);
  const ai = useSettings((s) => s.ai);
  const setAIEnabled = useSettings((s) => s.setAIEnabled);
  const setAIReadGlobalPrompt = useSettings((s) => s.setAIReadGlobalPrompt);
  const setAIReadLocalSkills = useSettings((s) => s.setAIReadLocalSkills);
  const setAISelectedModelId = useSettings((s) => s.setAISelectedModelId);
  const saveAICustomConfig = useSettings((s) => s.saveAICustomConfig);
  const [open, setOpen] = useState(false);
  const [setupStatus, setSetupStatus] = useState<SetupGuideAIStatus | null>(null);

  useEffect(() => {
    if (!hydrated || dismissed || guideVisible) return;
    setOpen(true);
  }, [dismissed, guideVisible, hydrated]);

  const configured = Boolean(
    readStoredApiKey(
      ai,
      ai.customProviderId,
      resolveProtocolForProvider(ai.customProviderId, ai.customProtocol),
    ).trim() &&
      ai.selectedModelId &&
      ai.customModelOptions.some((model) => model.id === ai.selectedModelId),
  );

  useEffect(() => {
    if (
      !open ||
      !configured ||
      !setupStatus?.ready ||
      setupStatus.busy ||
      setupStatus.dirty
    ) return;
    setOpen(false);
    dismissNotice(NOTICE_ID);
  }, [configured, dismissNotice, open, setupStatus]);

  if (!open || !hydrated || guideVisible || dismissed) return null;

  const close = () => {
    setOpen(false);
    dismissNotice(NOTICE_ID);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent className="writing-setup-prompt">
        <header className="writing-setup-prompt-header">
          <DialogTitle>配置 AI 写作助手</DialogTitle>
          <DialogDescription>选择服务商，保存配置并选择模型。</DialogDescription>
        </header>
        <div className="writing-setup-prompt-form">
          <SettingsAI
            mode="onboarding"
            ai={ai}
            enabled={ai.enabled}
            setEnabled={setAIEnabled}
            setReadGlobalPrompt={setAIReadGlobalPrompt}
            setReadLocalSkills={setAIReadLocalSkills}
            selectedModelId={ai.selectedModelId}
            setSelectedModelId={setAISelectedModelId}
            saveCustomConfig={saveAICustomConfig}
            onSetupStateChange={setSetupStatus}
          />
        </div>
        <footer className="writing-setup-prompt-actions">
          <Button type="button" variant="ghost" onClick={close}>
            稍后配置
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              close();
              openAISettings();
            }}
          >
            打开完整设置
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
