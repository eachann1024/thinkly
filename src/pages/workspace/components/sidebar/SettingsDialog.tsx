import { useLocale } from "@/i18n";
import { useEffect } from "react";
import { renderSettingsResetDialog } from "./settings-dialog/renderSettingsResetDialog";
import { renderSettingsScaffold } from "./settings-dialog/renderSettingsScaffold";
import { type SettingsDialogProps } from "./settings-dialog/shared";
import { useSettingsDialogState } from "./settings-dialog/useSettingsDialogState";
import { useSettingsImportExport } from "./settings-dialog/useSettingsImportExport";
import { useSettingsBackupRestore } from "./settings-dialog/useSettingsBackupRestore";
import { useSettingsResetActions } from "./settings-dialog/useSettingsResetActions";
import { useGitAvailability } from "./settings/useGitAvailability";

export function SettingsDialog(props: SettingsDialogProps) {
  useLocale();
  const gitAvailability = useGitAvailability(props.open);
  useEffect(() => {
    if (gitAvailability === "missing" && props.activeTab === "git-sync") props.onTabChange("general");
  }, [gitAvailability, props.activeTab, props.onTabChange]);
  const settings = useSettingsDialogState(props);
  const importExport = useSettingsImportExport(settings);
  const backupRestore = useSettingsBackupRestore(importExport);
  const settingsResetActionsContext = useSettingsResetActions(backupRestore);
  const context = settingsResetActionsContext;
  const { open, hasOpened } = context;

  if (!open && !hasOpened) return null;

  return (
    <>
      {renderSettingsScaffold(context, gitAvailability)}

      {renderSettingsResetDialog(context)}
    </>
  );
}
