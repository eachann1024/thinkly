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
    // Failed reads cannot establish a disk baseline.
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

export /**
 * 同一文件冲突 toast 去重：记录当前正在显示的冲突 toast id（key = filePath）。
 * toast 关闭后自动清除，确保同文件不叠弹。
 */
const activeConflictToasts = new Map<string, string | number>();

export function showConflictToast(
  filePath: string,
  pageId: string,
  onKeepMine: () => void,
  onLoadDisk: () => void,
) {
  // 去重：同文件已有 toast 则不重复弹
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

export /** 冲突 toast 两个按钮的标准行为（watch change / pre-save / 新鲜度检查共用）。 */
function conflictHandlers(filePath: string, pageId: string) {
  return {
    // 保留我的编辑：以磁盘当前内容为已知基线（内存编辑仍 dirty），再 force
    // 落盘覆盖。禁止把快照写成 ""——空快照会让之后任何磁盘内容都判成外部修改。
    // 读盘失败则 deleteLocalMdSnapshot：无快照时 isLocalMdUnchanged 为 false
    //（不会跳过写盘），isDiskContentMatchingSnapshot 为 true（不误报冲突）。
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
              // 指纹失败不影响强制落盘
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
    // 加载磁盘版本：丢弃本地编辑，重读磁盘
    onLoadDisk: () => {
      discardPendingLocalSave(pageId);
      usePages.setState((s) => ({
        dirtyLocalPageIds: { ...s.dirtyLocalPageIds, [pageId]: false },
      }));
      void usePages.getState().reloadLocalPageFromDisk(pageId);
    },
  };
}

export /**
 * 主动新鲜度检查：watch 不在场期间（Electron 窗口隐藏、查看其他笔记本、插件退出）
 * 的外部修改收不到 change 事件，在切页 / 窗口恢复可见时主动读盘 diff 兜底。
 * 没变 → 无操作；变了且页面干净且无近期交互 → 静默重载；变了且 dirty / 刚聚焦编辑器 → 冲突提示。
 */
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
