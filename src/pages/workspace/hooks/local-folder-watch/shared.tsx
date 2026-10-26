import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/hooks/local-folder-watch/shared.tsx#localMessages:1">`
zh-Hans:
  externalChange: "「{{name}}」已被外部修改"
  chooseHowToResolveTheConflict: "选择如何处理冲突"
  keepMyEdits: "保留我的编辑"
  loadDiskVersion: "加载磁盘版本"
en:
  externalChange: "{{name}} was changed outside the app"
  chooseHowToResolveTheConflict: "Choose how to resolve the conflict"
  keepMyEdits: "Keep my edits"
  loadDiskVersion: "Load disk version"
ja:
  externalChange: "「{{name}}」が外部で変更されました"
  chooseHowToResolveTheConflict: "競合の解決方法を選択してください"
  keepMyEdits: "自分の編集を保持"
  loadDiskVersion: "ディスク上の版を読み込む"
`;
const uiText = createTranslator(localMessages);
import { readMarkdownFile } from "@/lib/local-folder-scanner/entries";
import {
  readSharedMarkdown,
  validateMarkdownRead,
  withMarkdownReadHandoff,
} from "@/lib/local-folder-scanner/read-cache";
import { toast } from "@/components/ui/sonner";
import { usePages } from "@/stores/usePages";
import {
  isDiskContentMatchingSnapshot,
  isStatMatchingSnapshot,
  updateSnapshotAfterWrite,
  updateSnapshotStat,
  type LocalMdFileStat,
} from "@/lib/local-md-snapshot";
import {
  confirmRecoveredLocalSave,
  discardPendingLocalSave,
} from "@/stores/pages/folderSync";
import { wasRecentlyInteracting } from "@/lib/editor-interaction-signal";
import { useNotebooks } from "@/stores/useNotebooks";
import { noteMetadataNeedsRefresh } from "@/lib/note-metadata/watch";
import { parseLocalMarkdownContent } from "@/lib/local-folder-scanner/markdown";
import { pageWithParsedMarkdown } from "@/lib/local-folder-scanner/applyParsed";
import { hydrateNoteMetadata } from "@/lib/note-metadata/restore";
import { noteMetadataErrorMessage } from "@/lib/note-metadata/messages";

export interface Notebook {
  id: string;
  source?: string;
  localPath?: string;
}

export interface Page {
  localFilePath?: string;
}

export interface UseLocalFolderWatchOptions {
  notebook: Notebook | undefined;
  activePageId: string | null | undefined;
  page: Page | undefined;
}

export async function readDiskContent(
  filePath: string,
): Promise<string | null> {
  const fs = window.gooseFs;
  if (!fs) return null;
  try {
    return (await readSharedMarkdown(fs, filePath)).content;
  } catch {
  }
  return null;
}

export async function statDisk(
  filePath: string,
): Promise<LocalMdFileStat | null> {
  const fs = window.gooseFs;
  if (!fs?.statAsync) return null;
  try {
    return (await fs.statAsync(filePath)) ?? null;
  } catch {
    return null;
  }
}

export

const activeConflictToasts = new Map<string, string | number>();

export function showConflictToast(
  filePath: string,
  pageId: string,
  onKeepMine: () => void,
  onLoadDisk: () => void,
) {
  if (activeConflictToasts.has(filePath)) return;

  const fileName = filePath.replace(/^.*[\\/]/, "");
  const toastId = toast.warning(uiText("externalChange", {name: fileName}), {
    description: uiText("chooseHowToResolveTheConflict"),
    duration: Infinity,
    action: {
      label: uiText("keepMyEdits"),
      onClick: (_e) => {
        activeConflictToasts.delete(filePath);
        onKeepMine();
      },
    },
    cancel: {
      label: uiText("loadDiskVersion"),
      onClick: (_e) => {
        activeConflictToasts.delete(filePath);
        onLoadDisk();
      },
    },
    onDismiss: () => {
      activeConflictToasts.delete(filePath);
    },
    onAutoClose: () => {
      activeConflictToasts.delete(filePath);
    },
  });

  activeConflictToasts.set(filePath, toastId);
}

export
function conflictHandlers(filePath: string, pageId: string) {
  return {
    onKeepMine: () => {
      void (async () => {
        try {
          const pg = usePages.getState().pages[pageId];
          const fs = window.gooseFs;
          if (!pg || !fs || pg.localFilePath !== filePath) return;
          const root = useNotebooks.getState().notebooks[pg.workspaceId]?.localPath;
          const read = await readMarkdownFile(fs, filePath);
          if (read.content === null) throw Error(read.error || "无法读取磁盘笔记，已保留当前编辑");
          const restored = root ? await hydrateNoteMetadata(fs, root, read.content, filePath) : undefined;
          if (restored && restored.noteId !== pg.localMetadataId) throw Error("磁盘笔记 ID 已改变，已保留当前编辑");
          if (usePages.getState().pages[pageId] !== pg) return;
          if (restored?.noteId) usePages.setState(state => ({ pages: { ...state.pages,
            [pageId]: { ...pg, localMetadataRevision: restored.revision },
          } }));
          updateSnapshotAfterWrite(filePath, read.content);
          if (read.stat) updateSnapshotStat(filePath, read.stat);
          const saved = await usePages.getState().saveLocalPageContent(pageId, pg.content as any, { force: true });
          if (saved) confirmRecoveredLocalSave(pageId);
        } catch (error) {
          toast.error(noteMetadataErrorMessage(error));
          console.error("[local-folder] conflict force-save failed", error);
        }
      })();
    },
    onLoadDisk: () => {
      void (async () => {
        const page = usePages.getState().pages[pageId];
        const fs = window.gooseFs;
        const root = page && (page.localMetadataRoot ?? useNotebooks.getState().notebooks[page.workspaceId]?.localPath);
        if (!page || !fs || page.localFilePath !== filePath) return;
        const read = await readMarkdownFile(fs, filePath);
        const parsed = await parseLocalMarkdownContent(read.content, "", read.error, root ? { root, fs, filePath } : undefined);
        if (usePages.getState().pages[pageId] !== page) return;
        if (parsed.readState !== "ready" || parsed.metadataId !== page.localMetadataId) {
          toast.error(parsed.readError || uiText("chooseHowToResolveTheConflict"));
          return;
        }
        if (read.stat && !await validateMarkdownRead(fs, filePath, read, false)) return;
        let applied = false;
        usePages.setState((state) => {
          if (state.pages[pageId] !== page) return state;
          applied = true;
          return {
            pages: { ...state.pages, [pageId]: pageWithParsedMarkdown(page, parsed) },
            dirtyLocalPageIds: { ...state.dirtyLocalPageIds, [pageId]: false },
          };
        });
        if (!applied) return;
        discardPendingLocalSave(pageId);
        updateSnapshotAfterWrite(filePath, read.content!);
        if (read.stat) updateSnapshotStat(filePath, read.stat);
        if (usePages.getState().activePageId === pageId) window.dispatchEvent(
          new CustomEvent("goose-note:reload-active-editor", { detail: { pageId } }),
        );
      })().catch(error => console.error("[local-folder] conflict reload failed", error));
    },
  };
}

export

async function checkLocalPageFreshness(pageId: string): Promise<void> {
  const page = usePages.getState().pages[pageId];
  const filePath = page?.localFilePath;
  if (!filePath) return;

  const fs = window.gooseFs;
  if (!fs) return;
  const root = useNotebooks.getState().notebooks[page.workspaceId]?.localPath;
  if (root && await noteMetadataNeedsRefresh(fs, root, page)) {
    if (usePages.getState().dirtyLocalPageIds[pageId] || wasRecentlyInteracting(2000)) {
      const { onKeepMine, onLoadDisk } = conflictHandlers(filePath, pageId);
      showConflictToast(filePath, pageId, onKeepMine, onLoadDisk);
    } else await usePages.getState().reloadLocalPageFromDisk(pageId);
    return;
  }
  const stat = await statDisk(filePath);
  if (stat && isStatMatchingSnapshot(filePath, stat)) return;
  const read = await readSharedMarkdown(fs, filePath).catch(() => null);
  if (!read || read.content === null) return;
  if (usePages.getState().pages[pageId]?.localFilePath !== filePath) return;
  if (isDiskContentMatchingSnapshot(filePath, read.content)) {
    if (read.stat) updateSnapshotStat(filePath, read.stat);
    return;
  }

  const isDirty = Boolean(usePages.getState().dirtyLocalPageIds[pageId]);
  if (isDirty || wasRecentlyInteracting(2000)) {
    const { onKeepMine, onLoadDisk } = conflictHandlers(filePath, pageId);
    showConflictToast(filePath, pageId, onKeepMine, onLoadDisk);
    return;
  }
  withMarkdownReadHandoff(filePath, read, () => {
    void usePages.getState().reloadLocalPageFromDisk(pageId);
  });
}
