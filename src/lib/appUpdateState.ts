import type {
  AppReleaseDetails,
  AppUpdateRetryMetadata,
  AppUpdateState,
  AppUpdateTarget,
} from "./appUpdateTypes";
export type AppUpdateEvent =
  | { type: "check.started" }
  | {
      type: "check.current";
      version: string;
      details: AppReleaseDetails & { releaseUrl?: string };
    }
  | { type: "check.available"; target: AppUpdateTarget }
  | { type: "check.failed"; message: string; metadata: AppUpdateRetryMetadata }
  | { type: "download.started"; target: AppUpdateTarget }
  | {
      type: "download.progress";
      target: AppUpdateTarget;
      percent: number;
      message?: string;
    }
  | {
      type: "download.completed";
      target: AppUpdateTarget;
      path: string;
      message: string;
    }
  | {
      type: "download.failed";
      metadata: AppUpdateRetryMetadata;
      message: string;
    }
  | { type: "update.ready"; target: AppUpdateTarget; path: string }
  | {
      type: "install.failed";
      target: AppUpdateTarget;
      path?: string;
      message: string;
    };
export function updateRetryMetadata(
  state: AppUpdateState,
): AppUpdateRetryMetadata {
  return {
    version: state.version,
    assetName: state.assetName,
    downloadUrl: state.downloadUrl,
    downloadPath: state.downloadPath,
    releaseUrl: state.releaseUrl,
    releaseNotes: state.releaseNotes,
    publishedAt: state.publishedAt,
  };
}
export function getAppUpdateTarget(
  state: AppUpdateState,
): AppUpdateTarget | null {
  return state.version && state.assetName && state.downloadUrl
    ? {
        version: state.version,
        assetName: state.assetName,
        downloadUrl: state.downloadUrl,
        releaseUrl: state.releaseUrl,
        releaseNotes: state.releaseNotes,
        publishedAt: state.publishedAt,
      }
    : null;
}
export function appUpdateTransition(
  state: AppUpdateState,
  event: AppUpdateEvent,
): AppUpdateState {
  switch (event.type) {
    case "check.started":
      return { status: "checking" };
    case "check.current":
      return { ...event.details, status: "up-to-date", version: event.version };
    case "check.available":
      return { ...event.target, status: "available" };
    case "check.failed":
    case "download.failed":
      return { ...event.metadata, status: "error", message: event.message };
    case "download.started":
      return { ...event.target, status: "downloading", percent: 0 };
    case "download.progress":
      return state.status === "downloading" &&
        state.version === event.target.version &&
        state.assetName === event.target.assetName
        ? {
            ...event.target,
            status: "downloading",
            percent: event.percent,
            message: event.message,
          }
        : state;
    case "download.completed":
      return {
        ...event.target,
        status: "available",
        downloadPath: event.path,
        message: event.message,
      };
    case "update.ready":
      return { ...event.target, status: "ready", downloadPath: event.path };
    case "install.failed":
      return event.path
        ? {
            ...event.target,
            status: "ready",
            downloadPath: event.path,
            message: event.message,
          }
        : { ...event.target, status: "error", message: event.message };
  }
}
