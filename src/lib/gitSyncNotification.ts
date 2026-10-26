export type GitSyncNotificationTarget =
  | { type: "scheduler" }
  | { type: "repository"; repositoryId: string };

export function gitSyncNotificationKey(target: GitSyncNotificationTarget): string {
  return target.type === "scheduler"
    ? "git-sync:scheduler"
    : `git-sync:repository:${target.repositoryId}`;
}

export function gitSyncNotificationAction(target: GitSyncNotificationTarget) {
  return {
    type: "settings" as const,
    tab: "git-sync" as const,
    ...(target.type === "repository" ? { repositoryId: target.repositoryId } : {}),
  };
}

export class GitSyncNotificationRegistry {
  private readonly messages = new Map<string, { message: string; token: number }>();
  private nextToken = 0;

  show(
    target: GitSyncNotificationTarget,
    message: string,
    display: (
      action: ReturnType<typeof gitSyncNotificationAction>,
      key: string,
      onFailure: () => void,
    ) => boolean,
  ): boolean {
    const key = gitSyncNotificationKey(target);
    if (this.messages.get(key)?.message === message) return false;
    const entry = { message, token: ++this.nextToken };
    const revoke = () => {
      if (this.messages.get(key)?.token === entry.token) this.messages.delete(key);
    };
    this.messages.set(key, entry);
    let displayed = false;
    try {
      displayed = display(gitSyncNotificationAction(target), key, revoke);
    } catch {
      revoke();
    }
    if (!displayed) revoke();
    return displayed && this.messages.get(key)?.token === entry.token;
  }

  clear(target: GitSyncNotificationTarget, close: (key: string) => void): void {
    const key = gitSyncNotificationKey(target);
    this.messages.delete(key);
    close(key);
  }
}
