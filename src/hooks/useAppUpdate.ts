import { useEffect } from "react";
import type { AppUpdateCheckResult, AppUpdateState } from "@/lib/appUpdateTypes";
import { checkAppUpdate, downloadAppUpdate, readAppVersion } from "@/lib/electron/appUpdate";
import { getGooseDesktop } from "@/lib/electron/runtime";
import { useAppUpdateUi } from "@/stores/useAppUpdateUi";

let subscribers = 0;
let generation = 0;
let eventRevision = 0;
let unsubscribe: (() => void) | undefined;
let checkTask: Promise<void> | undefined;
let downloadTask: Promise<void> | undefined;
let installTask: Promise<void> | undefined;

function stateFromCheck(result: AppUpdateCheckResult): AppUpdateState {
  if (result.status === "unavailable") {
    return { status: "error", message: result.reason, releaseUrl: result.releaseUrl };
  }
  return {
    status: result.status,
    version: result.latestVersion,
    releaseUrl: result.releaseUrl,
    releaseNotes: result.releaseNotes,
    publishedAt: result.publishedAt,
    ...(result.status === "available"
      ? { downloadUrl: result.downloadUrl, assetName: result.assetName }
      : {}),
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "更新失败，请重试";
}

function setUpdateState(state: AppUpdateState) {
  eventRevision += 1;
  useAppUpdateUi.setState({ state });
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

function check(): Promise<void> {
  if (checkTask) return checkTask;
  const { state, installing } = useAppUpdateUi.getState();
  if (installing || state.status === "downloading" || state.status === "ready") return Promise.resolve();
  useAppUpdateUi.setState({ installError: "" });
  setUpdateState({ ...state, status: "checking", message: undefined });
  checkTask = (async () => {
    try {
      const result = await checkAppUpdate();
      if (!result) throw new Error("当前环境不支持应用更新");
      useAppUpdateUi.setState({ currentVersion: result.currentVersion });
      await readLatestState(stateFromCheck(result));
      const latest = useAppUpdateUi.getState().state;
      if (latest.status === "available" && !latest.downloadPath) void download();
    } catch (error) {
      const latest = useAppUpdateUi.getState().state;
      if (latest.status !== "ready" && latest.status !== "downloading") {
        setUpdateState({ ...latest, status: "error", message: errorMessage(error) });
      }
    }
  })().finally(() => { checkTask = undefined; });
  return checkTask;
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
          downloadUrl: undefined,
          assetName: undefined,
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
  return { ...ui, check, download, install, revealDownload };
}
