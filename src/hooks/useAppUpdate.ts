import { useEffect } from "react";
import type { AppUpdateState } from "@/lib/appUpdateTypes";
import { downloadAppUpdate, readAppVersion } from "@/lib/electron/appUpdate";
import { hasNewAppUpdate } from "@/lib/appUpdateAvailability";
import { getGooseDesktop } from "@/lib/electron/runtime";
import { useAppUpdateUi } from "@/stores/useAppUpdateUi";

let subscribers = 0;
let generation = 0;
let eventRevision = 0;
let unsubscribe: (() => void) | undefined;
let downloadTask: Promise<void> | undefined;
let installTask: Promise<void> | undefined;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "更新失败，请重试";
}

function setUpdateState(state: AppUpdateState) {
  eventRevision += 1;
  useAppUpdateUi.setState((ui) => ({ state, open: ui.open && hasNewAppUpdate(ui.currentVersion, state) }));
}

function subscribeUpdates() {
  subscribers += 1;
  if (subscribers === 1) {
    const desktop = getGooseDesktop();
    const currentGeneration = ++generation;
    if (desktop) {
      unsubscribe = desktop.onUpdateState(setUpdateState);
      const revision = eventRevision;
      void readAppVersion().then((version) => {
        if (currentGeneration === generation && version) useAppUpdateUi.setState({ currentVersion: version });
      });
      void desktop.getUpdateState().then((state) => {
        if (currentGeneration === generation && eventRevision === revision) setUpdateState(state);
      }).catch((error: unknown) => {
        if (currentGeneration === generation && eventRevision === revision) {
          setUpdateState({ status: "error", message: errorMessage(error) });
        }
      });
    }
  }
  return () => {
    subscribers -= 1;
    if (subscribers === 0) {
      generation += 1;
      unsubscribe?.();
      unsubscribe = undefined;
    }
  };
}

async function readLatestState(fallback: AppUpdateState) {
  const revision = eventRevision;
  const next = await getGooseDesktop()?.getUpdateState().catch(() => fallback);
  if (eventRevision === revision) setUpdateState(next ?? fallback);
}

function download(): Promise<void> {
  if (downloadTask) return downloadTask;
  const { state, installing } = useAppUpdateUi.getState();
  if (!state.downloadUrl || !state.assetName || state.downloadPath || installing || state.status === "ready") {
    return Promise.resolve();
  }
  useAppUpdateUi.setState({ installError: "" });
  setUpdateState({ ...state, status: "downloading", percent: 0, message: undefined });
  downloadTask = (async () => {
    try {
      const downloadPath = await downloadAppUpdate(state.downloadUrl!, state.assetName!);
      if (!downloadPath) throw new Error("当前环境不支持下载更新");
      await readLatestState({ ...state, status: "available", downloadPath, message: "安装包已下载" });
    } catch (error) {
      const latest = useAppUpdateUi.getState().state;
      if (latest.status !== "ready") {
        setUpdateState({
          ...latest,
          status: "error",
          message: errorMessage(error),
          percent: undefined,
        });
      }
    }
  })().finally(() => { downloadTask = undefined; });
  return downloadTask;
}

function install(): Promise<void> {
  if (installTask) return installTask;
  const desktop = getGooseDesktop();
  if (!desktop || useAppUpdateUi.getState().state.status !== "ready") return Promise.resolve();
  useAppUpdateUi.setState({ installError: "", installing: true });
  installTask = desktop.installReadyUpdate().catch((error: unknown) => {
    useAppUpdateUi.setState({ installing: false, installError: errorMessage(error) });
  }).finally(() => { installTask = undefined; });
  return installTask;
}

async function revealDownload() {
  const { state } = useAppUpdateUi.getState();
  if (!state.downloadPath) return;
  useAppUpdateUi.setState({ installError: "" });
  try {
    await getGooseDesktop()?.showItemInFolder(state.downloadPath);
  } catch (error) {
    useAppUpdateUi.setState({ installError: errorMessage(error) });
  }
}

export function useAppUpdate() {
  const ui = useAppUpdateUi();
  useEffect(subscribeUpdates, []);
  return { ...ui, download, install, revealDownload };
}
