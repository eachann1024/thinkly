export type AppReleaseDetails = {
  releaseNotes?: string;
  publishedAt?: string;
};

export type AppUpdateCheckResult = AppReleaseDetails & (
  | {
      status: "up-to-date";
      currentVersion: string;
      latestVersion: string;
      releaseUrl: string;
    }
  | {
      status: "available";
      currentVersion: string;
      latestVersion: string;
      assetName: string;
      downloadUrl: string;
      releaseUrl: string;
    }
  | {
      status: "unavailable";
      currentVersion: string;
      reason: string;
      releaseUrl: string;
    });

export type AppUpdateState = AppReleaseDetails & {
  status: "idle" | "checking" | "up-to-date" | "available" | "downloading" | "ready" | "error";
  version?: string;
  percent?: number;
  message?: string;
  downloadUrl?: string;
  assetName?: string;
  releaseUrl?: string;
  downloadPath?: string;
};
