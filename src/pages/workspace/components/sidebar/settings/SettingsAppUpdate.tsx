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
    <SettingsSectionCard title="应用更新">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-sm">
          <GooseIcons.Download aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
          <span>当前版本 v{currentVersion}</span>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>更新至 v{state.version}</Button>
      </div>
      {statusLabel && (
        <p role="status" aria-live="polite" className={`text-sm ${installError || state.status === "error" || (state.status === "ready" && state.message) ? "text-destructive" : "text-muted-foreground"}`}>
          {statusLabel}
        </p>
      )}
    </SettingsSectionCard>
  );
}
