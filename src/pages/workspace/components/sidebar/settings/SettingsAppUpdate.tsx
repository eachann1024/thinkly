import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/SettingsAppUpdate.tsx#localMessages:1">`
zh-Hans:
  appUpdates_3f91: "应用更新"
  currentVersion: "当前版本 v{{version}}"
  updateVersion: "更新至 v{{version}}"
en:
  appUpdates_3f91: "App updates"
  currentVersion: "Current version: v{{version}}"
  updateVersion: "Update to v{{version}}"
`;
const uiText = createTranslator(localMessages);
import { Button } from "@/components/ui/button";
import * as GooseIcons from "@/components/ui/icons";
import { updateStatusLabel } from "@/components/app-update/updatePresentation";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { hasNewAppUpdate } from "@/lib/appUpdateAvailability";
import { SettingsSectionCard } from "./SettingsSectionCard";

export function SettingsAppUpdate() {
  const { currentVersion, state, installing, installError, setOpen } = useAppUpdate();
  const statusLabel = updateStatusLabel(state, installing, installError);
  if (!hasNewAppUpdate(currentVersion, state)) return null;
  return (
    <SettingsSectionCard title={uiText("appUpdates_3f91")}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-sm">
          <GooseIcons.Download aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
          <span>{uiText("currentVersion", { version: currentVersion })}</span>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>{uiText("updateVersion", { version: state.version ?? "" })}</Button>
      </div>
      {statusLabel && (
        <p role="status" aria-live="polite" className={`text-sm ${installError || state.status === "error" || (state.status === "ready" && state.message) ? "text-destructive" : "text-muted-foreground"}`}>
          {statusLabel}
        </p>
      )}
    </SettingsSectionCard>
  );
}
