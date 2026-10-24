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
  withMarkdownReadHandoff,
} from "@/lib/local-folder-scanner/read-cache";
import { toast } from "@/components/ui/sonner";
import { usePages } from "@/stores/usePages";
import {
  isDiskContentMatchingSnapshot,
  isStatMatchingSnapshot,
  updateSnapshotAfterWrite,
  updateSnapshotStat,
  deleteLocalMdSnapshot,
  type LocalMdFileStat,
} from "@/lib/local-md-snapshot";
import {
  confirmRecoveredLocalSave,
  discardPendingLocalSave,
} from "@/stores/pages/folderSync";
import { wasRecentlyInteracting } from "@/lib/editor-interaction-signal";

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
          const fs = window.gooseFs;
          const diskContent = fs
            ? (await readMarkdownFile(fs, filePath)).content
            : null;
          if (diskContent !== null) {
            updateSnapshotAfterWrite(filePath, diskContent);
            try {
              const stat = await statDisk(filePath);
              if (stat) updateSnapshotStat(filePath, stat);
            } catch {
            }
          } else {
            deleteLocalMdSnapshot(filePath);
          }
        } catch {
          deleteLocalMdSnapshot(filePath);
        }
        const pg = usePages.getState().pages[pageId];
        if (!pg) return;
        void usePages
          .getState()
          .saveLocalPageContent(pageId, pg.content as any, { force: true })
          .then((saved) => {
            if (saved) confirmRecoveredLocalSave(pageId);
          })
          .catch((error) => {
            console.error("[local-folder] conflict force-save failed", error);
          });
      })();
    },
    onLoadDisk: () => {
      discardPendingLocalSave(pageId);
      usePages.setState((s) => ({
        dirtyLocalPageIds: { ...s.dirtyLocalPageIds, [pageId]: false },
      }));
      void usePages.getState().reloadLocalPageFromDisk(pageId);
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
