import { useLocale } from "@/i18n";
import type { AuxiliaryAISetupConfig } from "@/lib/auxiliary-window/contract";
import { normalizeAISettings, type AISettings } from "@/stores/settings/types/ai";
import {
  applyAISetupInMain,
  closeAuxiliary,
  openSettingsInMain,
  useAuxiliaryWindow,
} from "@/windows/AuxiliaryWindowContext";
import { useMainSnapshot } from "@/windows/data/mainSnapshot";
import { StandaloneWindowShell } from "@/windows/shell/StandaloneWindowShell";
import { AISetupForm } from "./ai-setup/AISetupForm";
import { uiText } from "./ai-setup/messages";
import { useState } from "react";

export function AISetupWindow() {
  useLocale();
  const { resizable } = useAuxiliaryWindow();
  const snapshot = useMainSnapshot<{ ai?: Partial<AISettings> }>("settings");
  const [saving, setSaving] = useState(false);
  const settings = snapshot.data?.ai ? normalizeAISettings(snapshot.data.ai) : null;

  const save = async (config: AuxiliaryAISetupConfig) => {
    if (saving) return;
    setSaving(true);
    const applied = await applyAISetupInMain(config).catch(() => false);
    if (!applied) {
      setSaving(false);
      return;
    }
    await closeAuxiliary();
  };

  return (
    <StandaloneWindowShell title={uiText("title")} maximizable={resizable} inset>
      {!snapshot.ready || !settings ? (
        <p className="p-6 text-[13px] leading-5 text-muted-foreground">
          {snapshot.ready ? uiText("unavailable") : null}
        </p>
      ) : (
        <AISetupForm
          settings={settings}
          saving={saving}
          onSave={(config) => void save(config)}
          onLater={() => void closeAuxiliary()}
          onOpenSettings={() => {
            void openSettingsInMain("ai");
            void closeAuxiliary();
          }}
        />
      )}
    </StandaloneWindowShell>
  );
}
