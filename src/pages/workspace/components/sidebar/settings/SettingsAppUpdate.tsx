import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/SettingsAppUpdate.tsx#localMessages:1">`
zh-Hans:
  appUpdates_3f91: "应用更新"
  currentVersion: "当前版本 v{{version}}"
  updateVersion: "更新至 v{{version}}"
  checkForUpdates: "检查更新"
en:
  appUpdates_3f91: "App updates"
  currentVersion: "Current version: v{{version}}"
  updateVersion: "Update to v{{version}}"
  checkForUpdates: "Check for updates"
ja:
  appUpdates_3f91: "アプリのアップデート"
  currentVersion: "現在のバージョン v{{version}}"
  updateVersion: "v{{version}} にアップデート"
  checkForUpdates: "アップデートを確認"
`;
const uiText = createTranslator(localMessages);
import { Button } from "@/components/ui/button";
import * as GooseIcons from "@/components/ui/icons";
import { updateStatusLabel } from "@/components/app-update/updatePresentation";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { shouldShowAppUpdateSettings, hasNewAppUpdate } from "@/lib/appUpdateAvailability";
import { getGooseDesktop } from "@/lib/electron/runtime";
import { SettingsSectionCard } from "./SettingsSectionCard";

export function SettingsAppUpdate() {
  useLocale();
  const { currentVersion, state, installing, installError, checking, checkForUpdates, setOpen } = useAppUpdate();
  const statusLabel = updateStatusLabel(state, installing, installError);
  const hasUpdate = hasNewAppUpdate(currentVersion, state);
  const canCheckManually = Boolean(getGooseDesktop()?.checkForUpdate);
  if (!shouldShowAppUpdateSettings(currentVersion, state, canCheckManually)) return null;
  return (
    <SettingsSectionCard title={uiText("appUpdates_3f91")}>
      <div className={`goose-settings-option-row flex flex-col justify-center${statusLabel ? " goose-settings-option-row--stack" : ""}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3 text-sm font-normal leading-5">
            <GooseIcons.Download aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0">{uiText("currentVersion", { version: currentVersion })}</span>
          </div>
          {hasUpdate ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>{uiText("updateVersion", { version: state.version ?? "" })}</Button>
          ) : (
            <Button type="button" variant="outline" size="sm" disabled={!canCheckManually || checking} busy={checking} onClick={() => void checkForUpdates()}>
              {uiText("checkForUpdates")}
            </Button>
          )}
        </div>
        {statusLabel ? (
          <p role="status" aria-live="polite" className={`text-sm font-normal leading-5 ${installError || state.status === "error" || (state.status === "ready" && state.message) ? "text-destructive" : "text-muted-foreground"}`}>
            {statusLabel}
          </p>
        ) : null}
      </div>
    </SettingsSectionCard>
  );
}
