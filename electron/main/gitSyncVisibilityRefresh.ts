import { safeStorage } from "electron";
import type { GitRepositoryConfig, GitRepositoryVisibility } from "../../src/lib/git-sync-contract";
import { checkGitVisibility } from "./gitSyncVisibility";

const refreshing = new Set<string>();

/** Metadata requests must not occupy the synchronization queue while waiting on
 * the network. The caller applies results only if the configuration is current. */
export function refreshGitVisibility(config: GitRepositoryConfig, encrypted: string | undefined, apply: (result: GitRepositoryVisibility) => Promise<void>) {
  const checked = Date.parse(config.visibility.checkedAt ?? "");
  if (refreshing.has(config.id) || (Number.isFinite(checked) && Date.now() - checked < 86_400_000)) return;
  refreshing.add(config.id);
  void (async () => {
    let token: string | undefined;
    if (encrypted) {
      try {
        if (!safeStorage.isEncryptionAvailable() || (process.platform === "linux" && safeStorage.getSelectedStorageBackend() === "basic_text")) throw new Error();
        token = safeStorage.decryptString(Buffer.from(encrypted, "base64"));
      } catch {
        await apply({ value: "unknown", checkedAt: new Date().toISOString(), reason: "无法读取检查凭据，请重新输入或清除；不影响 SSH 同步" });
        return;
      }
    }
    await apply(await checkGitVisibility(config, token));
  })().catch(() => undefined).finally(() => refreshing.delete(config.id));
}
