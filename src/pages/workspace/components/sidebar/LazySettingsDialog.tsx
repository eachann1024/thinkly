import { Suspense, lazy, useState } from "react";
import type { SettingsDialogProps } from "./settings-dialog/shared";

const SettingsDialog = lazy(() =>
  import("./SettingsDialog").then((mod) => ({ default: mod.SettingsDialog })),
);

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
