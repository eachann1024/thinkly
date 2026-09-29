import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { syncGitNotebook } from "../../electron/main/gitSyncEngine.js";

const config = (localPath: string, remoteUrl = "git@github.com:owner/notebook.git") => ({
  notebookId: "notebook",
  localPath,
  provider: "github" as const,
  remoteUrl,
  branch: "main",
  intervalMinutes: 5,
  enabled: true,
});

describe("syncGitNotebook configuration boundaries", () => {
  test("rejects transports other than supported provider SSH", async () => {
    const root = await mkdtemp(join(tmpdir(), "goose-git-sync-"));
    try {
      await expect(syncGitNotebook(config(root, "https://github.com/owner/notebook.git"))).rejects.toThrow("github.com 的 SSH");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("rejects a provider and host mismatch before touching the folder", async () => {
    const root = await mkdtemp(join(tmpdir(), "goose-git-sync-"));
    try {
      await expect(syncGitNotebook({ ...config(root, "git@gitee.com:owner/notebook.git"), provider: "github" })).rejects.toThrow("github.com 的 SSH");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
