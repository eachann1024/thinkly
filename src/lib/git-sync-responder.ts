import { gitText } from "./git-messages";
import { migrateNotebookHistory } from "./history/localDisk";
import { canonicalRelativePath } from "./canonicalLocalPath";
import { acquireLocalPageFileOperation } from "@/stores/pages/folderSync";
import { usePages } from "@/stores/usePages";
import { useNotebooks } from "@/stores/useNotebooks";
import { holdGitSyncWrites, releaseGitSyncWrites } from "./git-sync-write-barrier";
import { GitSyncPreparation, gitSyncPreparationFailure } from "./git-sync-preparation";

let installed = false;
export function installGitSyncResponder() {
  const bridge = window.gooseDesktop?.gitSync;
  if (installed || !bridge) return;
  installed = true;
  const preparations = new GitSyncPreparation();
  bridge.onFinish((requestId) => preparations.finish(requestId));
  bridge.onPrepare((requestId, roots) => {
    void preparations.prepare(requestId, async (request) => {
      if (!Array.isArray(roots) || !roots.length || roots.some((root) => typeof root !== "string" || !root)) throw new Error(gitText("invalidFolders"));
      const canonical = await Promise.all(roots.map((root) => window.gooseDesktop!.fsRealpath(root)));
      const normalized = canonical.map((root) => /Mac|Win/i.test(navigator.platform) ? root.toLowerCase() : root);
      for (let i = 0; i < normalized.length; i++) for (let j = 0; j < i; j++) {
        if (normalized[i] === normalized[j] || normalized[i]!.startsWith(`${normalized[j]}/`) || normalized[j]!.startsWith(`${normalized[i]}/`)) throw new Error(gitText("overlappingFolders"));
      }
      const notebooks = Object.values(useNotebooks.getState().notebooks).filter((item) => item.source === "local-folder" && item.localPath);
      const notebookPaths = await Promise.all(notebooks.map(async (item) => ({ item, path: await window.gooseDesktop!.fsRealpath(item.localPath!).catch(() => null) })));
      const selected = canonical.map((root) => {
        const notebook = notebookPaths.find((entry) => entry.path === root)?.item;
        if (!notebook) throw new Error(gitText("reopenFolder"));
        return notebook;
      });
      window.dispatchEvent(new CustomEvent("goose-note:flush-editor", { detail: { immediate: true } }));
      await usePages.getState().flushPendingLocalSaves();
      const ids = new Set(selected.map((notebook) => notebook.id));
      const pages = Object.values(usePages.getState().pages).filter((page) => ids.has(page.workspaceId));
      if (pages.some((page) => usePages.getState().dirtyLocalPageIds[page.id])) throw new Error(gitText("saveBeforeSync"));
      if (request.finished) return;
      // All roots share one flush. Acquiring another root never flushes behind a held barrier.
      for (const [index, root] of canonical.entries()) {
        const paths = new Set([root, selected[index]!.localPath!]);
        for (const [alias, value] of [...paths].entries()) {
          const key = `${requestId}:${index}:${alias}`;
          holdGitSyncWrites(key, value);
          request.addRelease(() => releaseGitSyncWrites(key));
        }
      }
      for (const notebook of selected) {
        const paths = Object.fromEntries(pages.filter((page) => page.workspaceId === notebook.id && page.localFilePath && !page.isFolder)
          .map((page) => [page.id, canonicalRelativePath(notebook.localPath!, page.localFilePath!)!]).filter(([, path]) => path));
        await migrateNotebookHistory(notebook.localPath!, paths);
        if (request.finished) return;
      }
      for (const page of pages) {
        const release = await acquireLocalPageFileOperation(page.id);
        request.addRelease(release);
        if (request.finished) return;
      }
    }).then((ready) => { if (ready) bridge.replyPrepare(requestId, null); }).catch((error) => {
      console.error("[git-sync] workspace preparation failed", error);
      bridge.replyPrepare(requestId, gitSyncPreparationFailure(error));
    });
  });
}
