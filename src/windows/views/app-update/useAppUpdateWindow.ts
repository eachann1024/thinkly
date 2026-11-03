import { useEffect, useState } from "react";
import packageInfo from "../../../../package.json";
import { readAppVersion } from "@/lib/electron/appUpdate";
import { getGooseDesktop } from "@/lib/electron/runtime";
import type { AppUpdateState } from "@/lib/appUpdateTypes";

const idle: AppUpdateState = { status: "idle" };

export function useAppUpdateWindow() {
  const [currentVersion, setCurrentVersion] = useState(packageInfo.version || "");
  const [state, setState] = useState<AppUpdateState>(idle);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState("");

  useEffect(() => {
    const desktop = getGooseDesktop();
    if (!desktop) return;
    let current = true;
    void readAppVersion().then((version) => {
      if (current && version) setCurrentVersion(version);
    });
    void desktop.getUpdateState().then((next) => {
      if (current) setState(next);
    }).catch(() => undefined);
    const unsubscribe = desktop.onUpdateState((next) => {
      setState(next);
      if (next.status !== "ready") setInstalling(false);
    });
    return () => {
      current = false;
      unsubscribe();
    };
  }, []);

  const download = () => {
    const desktop = getGooseDesktop();
    if (!desktop?.downloadUpdate || !state.downloadUrl || !state.assetName) return;
    setInstallError("");
    void desktop.downloadUpdate(state.downloadUrl, state.assetName).catch(() => undefined);
  };

  const install = () => {
    const desktop = getGooseDesktop();
    if (!desktop || state.status !== "ready" || installing) return;
    setInstalling(true);
    setInstallError("");
    void desktop.installReadyUpdate().catch((error: unknown) => {
      setInstalling(false);
      setInstallError(error instanceof Error ? error.message : "");
    });
  };

  const reveal = () => {
    if (!state.downloadPath) return;
    void getGooseDesktop()?.showItemInFolder(state.downloadPath);
  };

  return { currentVersion, state, installing, installError, download, install, reveal };
}
