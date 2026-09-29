import { acquireLocalPageFileOperation } from "@/stores/pages/folderSync";
import { usePages } from "@/stores/usePages";
import { useNotebooks } from "@/stores/useNotebooks";
import { holdGitSyncWrites, releaseGitSyncWrites } from "./git-sync-write-barrier";

let installed = false;
export function installGitSyncResponder() {
  const bridge = window.gooseDesktop?.gitSync;
  if (installed || !bridge) return;
  installed = true;
  const requests = new Map<string, { finished: boolean; releases: (() => void)[] }>();
  bridge.onFinish((requestId) => {
    const request = requests.get(requestId);
    if (request) {
      request.finished = true;
      request.releases.splice(0).forEach((release) => release());
    }
    releaseGitSyncWrites(requestId);
    releaseGitSyncWrites(`${requestId}:alias`);
    requests.delete(requestId);
  });
  bridge.onPrepare((requestId, root) => {
    const request = { finished: false, releases: [] as (() => void)[] };
    requests.set(requestId, request);
    void (async () => {
      try {
        const notebooks = Object.values(useNotebooks.getState().notebooks).filter((item) => item.source === "local-folder" && item.localPath);
        const notebookPaths = await Promise.all(notebooks.map(async (item) => ({ item, path: await window.gooseDesktop!.fsRealpath(item.localPath!) })));
        const notebook = notebookPaths.find((entry) => entry.path === root)?.item;
        if (!notebook) throw new Error("同步记事本已移除或路径已变化，请在设置中断开旧配置");
        window.dispatchEvent(new CustomEvent("goose-note:flush-editor", { detail: { immediate: true } }));
        await usePages.getState().flushPendingLocalSaves();
        if (notebook && Object.values(usePages.getState().pages).some((page) => page.workspaceId === notebook.id && usePages.getState().dirtyLocalPageIds[page.id])) {
          throw new Error("记事本还有未保存的内容，请先处理保存异常后重试同步");
        }
        if (request.finished) return;
        holdGitSyncWrites(requestId, root);
        if (notebook.localPath !== root) holdGitSyncWrites(`${requestId}:alias`, notebook.localPath!);
        // 等待已经进入序列化/写盘的保存，新保存会停在 barrier。
        const pages = Object.values(usePages.getState().pages).filter((page) => page.workspaceId === notebook.id);
        for (const page of pages) {
          const release = await acquireLocalPageFileOperation(page.id);
          if (request.finished) { release(); return; }
          request.releases.push(release);
        }
        bridge.replyPrepare(requestId, null);
      } catch (error) {
        request.releases.splice(0).forEach((release) => release());
        releaseGitSyncWrites(requestId);
        releaseGitSyncWrites(`${requestId}:alias`);
        bridge.replyPrepare(requestId, error instanceof Error ? error.message : String(error));
      } finally {
        if (request.finished) requests.delete(requestId);
      }
    })();
  });
}
