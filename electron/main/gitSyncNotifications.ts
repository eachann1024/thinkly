import { GitSyncNotificationRegistry, type GitSyncNotificationTarget } from "../../src/lib/gitSyncNotification";
import { clearActionableNotification, showActionableNotification } from "./notifications";
import { t } from "./i18n/gitSyncMessages";

const registry = new GitSyncNotificationRegistry();

export function notifyGitSyncFailure(target: GitSyncNotificationTarget, message: string): void {
  registry.show(target, message, (action, key, onFailure) =>
    showActionableNotification({ title: t("notification"), body: message }, action, undefined, key, onFailure));
}

export function clearGitSyncNotification(target: GitSyncNotificationTarget): void {
  registry.clear(target, clearActionableNotification);
}

export function clearAllGitSyncNotifications(repositoryIds: Iterable<string>): void {
  clearGitSyncNotification({ type: "scheduler" });
  for (const repositoryId of repositoryIds) {
    clearGitSyncNotification({ type: "repository", repositoryId });
  }
}
