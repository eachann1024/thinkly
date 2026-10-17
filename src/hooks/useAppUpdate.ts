import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n/core";
const storeText = createTranslator(i18nYaml<"src/hooks/useAppUpdate.ts#block1:1">`
zh-Hans:
  updateFailed: "更新失败，请重试"
  downloadUnavailable: "当前环境不支持下载更新"
  downloaded: "安装包已下载"
en:
  updateFailed: "Update failed. Please try again."
  downloadUnavailable: "Downloading updates is not supported in this environment."
  downloaded: "Installer downloaded"
ja:
  updateFailed: "アップデートに失敗しました。もう一度お試しください"
  downloadUnavailable: "この環境ではアップデートのダウンロードに対応していません"
  downloaded: "インストーラをダウンロードしました"
`);
import { useEffect } from "react";
import type { AppUpdateState } from "@/lib/appUpdateTypes";
import { downloadAppUpdate, readAppVersion } from "@/lib/electron/appUpdate";
import {
  getAppUpdateTarget,
  appUpdateTransition,
  updateRetryMetadata,
} from "@/lib/appUpdateState";
import { getGooseDesktop } from "@/lib/electron/runtime";
import { useAppUpdateUi } from "@/stores/useAppUpdateUi";

let subscribers = 0;
let generation = 0;
let eventRevision = 0;
let unsubscribe: (() => void) | undefined;
let downloadTask: Promise<void> | undefined;
let installTask: Promise<void> | undefined;
let nextInstallId = 0;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : storeText("updateFailed");
}

function setUpdateState(state: AppUpdateState) {
  eventRevision += 1;
  useAppUpdateUi.getState().send({ type: "state.received", state });
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
        if (currentGeneration === generation && version)
          useAppUpdateUi.getState().send({ type: "version.received", version });
      });
      void desktop
        .getUpdateState()
        .then((state) => {
          if (currentGeneration === generation && eventRevision === revision)
            setUpdateState(state);
        })
        .catch((error: unknown) => {
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
  const next = await getGooseDesktop()
    ?.getUpdateState()
    .catch(() => fallback);
  if (eventRevision === revision) setUpdateState(next ?? fallback);
}

function download(): Promise<void> {
  if (downloadTask) return downloadTask;
  const { state, operation, send } = useAppUpdateUi.getState();
  const target = getAppUpdateTarget(state);
  if (
    !target ||
    state.downloadPath ||
    operation.status === "installing" ||
    state.status === "ready"
  ) {
    return Promise.resolve();
  }
  eventRevision += 1;
  send({ type: "download.started", target });
  downloadTask = (async () => {
    try {
      const downloadPath = await downloadAppUpdate(
        target.downloadUrl,
        target.assetName,
      );
      if (!downloadPath) throw new Error(storeText("downloadUnavailable"));
      await readLatestState(
        appUpdateTransition(state, {
          type: "download.completed",
          target,
          path: downloadPath,
          message: storeText("downloaded"),
        }),
      );
    } catch (error) {
      const latest = useAppUpdateUi.getState().state;
      if (latest.status !== "ready") {
        setUpdateState(
          appUpdateTransition(latest, {
            type: "download.failed",
            metadata: updateRetryMetadata(latest),
            message: errorMessage(error),
          }),
        );
      }
    }
  })().finally(() => {
    downloadTask = undefined;
  });
  return downloadTask;
}

function install(): Promise<void> {
  if (installTask) return installTask;
  const desktop = getGooseDesktop();
  const ui = useAppUpdateUi.getState();
  if (
    !desktop ||
    ui.state.status !== "ready" ||
    ui.operation.status === "installing"
  )
    return Promise.resolve();
  const id = ++nextInstallId;
  ui.send({ type: "install.started", id });
  installTask = desktop
    .installReadyUpdate()
    .catch((error: unknown) => {
      useAppUpdateUi
        .getState()
        .send({ type: "install.failed", id, message: errorMessage(error) });
    })
    .finally(() => {
      installTask = undefined;
    });
  return installTask;
}

async function revealDownload() {
  const { state } = useAppUpdateUi.getState();
  if (!state.downloadPath) return;
  useAppUpdateUi.getState().send({ type: "feedback.dismissed" });
  try {
    await getGooseDesktop()?.showItemInFolder(state.downloadPath);
  } catch (error) {
    useAppUpdateUi
      .getState()
      .send({ type: "reveal.failed", message: errorMessage(error) });
  }
}

export function useAppUpdate() {
  useLocale();
  const ui = useAppUpdateUi();
  useEffect(subscribeUpdates, []);
  return {
    ...ui,
    installing: ui.operation.status === "installing",
    installError: ui.operation.status === "failed" ? ui.operation.message : "",
    download,
    install,
    revealDownload,
  };
}
