import { Suspense, useState } from "react";
import type { SettingsDialogProps } from "./settings-dialog/shared";
import { settingsDialog } from "./settingsDialogLoader";

const SettingsDialog = settingsDialog.Component;

export function LazySettingsDialog(props: SettingsDialogProps) {
  const [everOpened, setEverOpened] = useState(props.open);
  if (props.open && !everOpened) setEverOpened(true);
  if (!everOpened) return null;
  return (
    <Suspense fallback={null}>
      <SettingsDialog {...props} />
    </Suspense>
  );
}
