import { useEffect, useRef, useState } from "react";
import type { AppUpdateCheckResult, AppUpdateState } from "@/lib/appUpdateTypes";
import { checkAppUpdate, downloadAppUpdate, readAppVersion } from "@/lib/electron/appUpdate";
import { getGooseDesktop } from "@/lib/electron/runtime";

function stateFromCheck(result: AppUpdateCheckResult): AppUpdateState {
  if (result.status === "unavailable") {
    return { status: "error", message: result.reason, releaseUrl: result.releaseUrl };
  }
  return {
    status: result.status,
    version: result.latestVersion,
    releaseUrl: result.releaseUrl,
    ...(result.status === "available"
      ? { downloadUrl: result.downloadUrl, assetName: result.assetName }
      : {}),
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "更新失败，请重试";
}

export function useAppUpdate() {
  const [currentVersion, setCurrentVersion] = useState("");
  const [state, setState] = useState<AppUpdateState>({ status: "idle" });
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState("");
  const eventRevision = useRef(0);

  useEffect(() => {
    const desktop = getGooseDesktop();
    if (!desktop) return;
    let active = true;
    const unsubscribe = desktop.onUpdateState((next) => {
      eventRevision.current += 1;
      setState(next);
    });
    const initialRevision = eventRevision.current;
    void readAppVersion().then((version) => {
      if (active) setCurrentVersion(version);
    });
    void desktop.getUpdateState().then((next) => {
      if (active && eventRevision.current === initialRevision) setState(next);
    }).catch((error: unknown) => {
      if (active && eventRevision.current === initialRevision) {
        setState({ status: "error", message: errorMessage(error) });
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const readLatestState = async (fallback: AppUpdateState) => {
    const revision = eventRevision.current;
    const next = await getGooseDesktop()?.getUpdateState().catch(() => fallback);
    if (eventRevision.current === revision) setState(next ?? fallback);
  };

  const check = async () => {
    setInstallError("");
    setState({ status: "checking" });
    try {
      const result = await checkAppUpdate();
      if (!result) throw new Error("当前环境不支持应用更新");
      setCurrentVersion(result.currentVersion);
      await readLatestState(stateFromCheck(result));
    } catch (error) {
      setState({ status: "error", message: errorMessage(error) });
    }
  };

  const download = async () => {
    if (!state.downloadUrl || !state.assetName) return;
    setInstallError("");
    setState({ ...state, status: "downloading", percent: 0, message: undefined });
    try {
      const downloadPath = await downloadAppUpdate(state.downloadUrl, state.assetName);
      if (!downloadPath) throw new Error("当前环境不支持下载更新");
      await readLatestState({ ...state, status: "idle", downloadPath, message: "安装包已下载" });
    } catch (error) {
      setState({ status: "error", message: errorMessage(error), releaseUrl: state.releaseUrl });
    }
  };

  const install = async () => {
    const desktop = getGooseDesktop();
    if (!desktop) return;
    setInstallError("");
    setInstalling(true);
    try {
      await desktop.installReadyUpdate();
    } catch (error) {
      setInstalling(false);
      setInstallError(errorMessage(error));
    }
  };

  const revealDownload = async () => {
    if (!state.downloadPath) return;
    setInstallError("");
    try {
      await getGooseDesktop()?.showItemInFolder(state.downloadPath);
    } catch (error) {
      setInstallError(errorMessage(error));
    }
  };

  return { currentVersion, state, installing, installError, check, download, install, revealDownload };
}
