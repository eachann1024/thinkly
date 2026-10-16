export type AppReleaseDetails = {
  releaseNotes?: string;
  publishedAt?: string;
};

export type AppUpdateCheckResult = AppReleaseDetails &
  (
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
      }
  );

export type AppUpdateTarget = AppReleaseDetails & {
  version: string;
  assetName: string;
  downloadUrl: string;
  releaseUrl?: string;
};
export type AppUpdateRetryMetadata = AppReleaseDetails & {
  version?: string;
  assetName?: string;
  downloadUrl?: string;
  releaseUrl?: string;
  downloadPath?: string;
};
type NoUpdateTarget = {
  version?: never;
  assetName?: never;
  downloadUrl?: never;
  downloadPath?: never;
  percent?: never;
  message?: never;
};
export type AppUpdateState = AppReleaseDetails &
  (
    | ({ status: "idle" | "checking"; releaseUrl?: never } & NoUpdateTarget)
    | {
        status: "up-to-date";
        version: string;
        releaseUrl?: string;
        assetName?: never;
        downloadUrl?: never;
        downloadPath?: never;
        percent?: never;
        message?: never;
      }
    | (AppUpdateTarget & {
        status: "available";
        downloadPath?: string;
        message?: string;
        percent?: never;
      })
    | (AppUpdateTarget & {
        status: "downloading";
        percent: number;
        message?: string;
        downloadPath?: never;
      })
    | (AppUpdateTarget & {
        status: "ready";
        downloadPath: string;
        message?: string;
        percent?: never;
      })
    | (AppUpdateRetryMetadata & {
        status: "error";
        message: string;
        percent?: never;
      })
  );
