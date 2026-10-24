import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/openAssociatedMarkdown.ts#localMessages:1">`
zh-Hans:
  retry: "重试"
  permission: "没有文件访问权限，请在系统中允许访问或调整文件权限后重试。"
  couldnTOpenThisMarkdownFile: "无法打开该 Markdown 文件"
  theFileIsnTInsideAFolderThatCan: "文件不在可挂载的文件夹内。"
  theFileIsnTAmongTheVisibleNotesIn: "文件不在当前仓库的可见笔记中。"
en:
  retry: "Retry"
  permission: "File access was denied. Allow access in your system or adjust file permissions, then retry."
  couldnTOpenThisMarkdownFile: "Couldn’t open this Markdown file"
  theFileIsnTInsideAFolderThatCan: "The file isn’t inside a folder that can be opened as a notebook."
  theFileIsnTAmongTheVisibleNotesIn: "The file isn’t among the visible notes in the current repository."
ja:
  retry: "再試行"
  permission: "ファイルへのアクセスが拒否されました。システムのアクセス権を確認してから再試行してください。"
  couldnTOpenThisMarkdownFile: "この Markdown ファイルを開けません"
  theFileIsnTInsideAFolderThatCan: "ファイルがマウント可能なフォルダ内にありません。"
  theFileIsnTAmongTheVisibleNotesIn: "ファイルが現在のリポジトリの表示中のノートに含まれていません。"
`;
const uiText = createTranslator(localMessages);
import { activateWorkspace } from "@/lib/settings-navigation";
import { toast } from "@/components/ui/sonner";
import {
  comparisonLocalPath,
  isCanonicalPathInside,
  localPathsAreCaseInsensitive,
} from "@/lib/canonicalLocalPath";
import { openStandaloneMarkdownPage } from "@/lib/openStandaloneMarkdown";
import { closeNotebookAiIfFullscreen } from "@/pages/workspace/components/notebook-ai/useNotebookAiPanel";
import { getGooseDesktop } from "@/lib/electron/runtime";
import { rememberAssociatedMarkdownPath } from "@/lib/associated-markdown-paths";
import { markAssociatedMarkdownOpened } from "@/lib/workspaceStartup";
import type { Notebook } from "@/stores/useNotebooks";
import { useNotebooks } from "@/stores/useNotebooks";
import { usePages } from "@/stores/usePages";
import { useSidebarView } from "@/stores/useSidebarView";
import { useTabs } from "@/stores/useTabs";

function comparisonPath(filePath: string): string {
  return comparisonLocalPath(filePath, localPathsAreCaseInsensitive());
}

function isFileInsideRoot(filePath: string, rootPath: string): boolean {
  return isCanonicalPathInside(
    filePath,
    rootPath,
    localPathsAreCaseInsensitive(),
  );
}

export function findContainingLocalFolderNotebook(
  filePath: string,
  notebooks: Iterable<Notebook>,
): Notebook | undefined {
  const matches = [...notebooks].filter(
    (notebook) =>
      notebook.source === "local-folder" &&
      typeof notebook.localPath === "string" &&
      notebook.localPath.length > 0 &&
      isFileInsideRoot(filePath, notebook.localPath),
  );
  matches.sort(
    (left, right) => (right.localPath?.length ?? 0) - (left.localPath?.length ?? 0),
  );
  return matches[0];
}

function findPageIdByLocalFilePath(
  filePath: string,
  notebookId: string,
): string | null {
  const target = comparisonPath(filePath);
  const page = Object.values(usePages.getState().pages).find((candidate) => {
    if (candidate.workspaceId !== notebookId || candidate.isFolder) return false;
    if (!candidate.localFilePath) return false;
    return comparisonPath(candidate.localFilePath) === target;
  });
  return page?.id ?? null;
}

async function openPageInNotebook(
  notebookId: string,
  pageId: string,
): Promise<void> {
  activateWorkspace();
  closeNotebookAiIfFullscreen();
  if (useNotebooks.getState().notebooks[notebookId]) {
    useNotebooks.getState().setLastActivePage(notebookId, pageId);
  }
  useTabs.getState().openPermanentTab(pageId);
  await usePages.getState().setActivePage(pageId);
  usePages.getState().setExpandPageId(pageId);
  const sidebar = useSidebarView.getState();
  sidebar.setSelected(notebookId, pageId);
  sidebar.setFocused(notebookId, pageId);
  const page = usePages.getState().pages[pageId];
  if (page?.localReadState === "error") {
    const detail = page.localReadError ?? "";
    toast.error(uiText("couldnTOpenThisMarkdownFile"), {
      description: /EPERM|EACCES|permission|access denied/i.test(detail) ? uiText("permission") : detail,
      action: { label: uiText("retry"), onClick: () => {
        void usePages.getState().reloadLocalPageFromDisk(pageId).then(() => openPageInNotebook(notebookId, pageId));
      } },
    });
  }
}

export async function openAssociatedMarkdownFile(
  filePath: string,
): Promise<boolean> {
  const trimmed = filePath.trim();
  if (!trimmed) return false;
  markAssociatedMarkdownOpened();

  const notebook = findContainingLocalFolderNotebook(
    trimmed,
    Object.values(useNotebooks.getState().notebooks),
  );

  if (!notebook) {
    const pageId = await openStandaloneMarkdownPage(trimmed);
    await openPageInNotebook(usePages.getState().pages[pageId].workspaceId, pageId);
    return true;
  }


  rememberAssociatedMarkdownPath(notebook.id, trimmed);

  let pageId = findPageIdByLocalFilePath(trimmed, notebook.id);
  if (!pageId && notebook.localPath) {
    await usePages
      .getState()
      .addSingleLocalPage(notebook.id, notebook.localPath, trimmed, {
        force: true,
      });
    pageId = findPageIdByLocalFilePath(trimmed, notebook.id);
  }

  if (!pageId) {
    toast.error(uiText("couldnTOpenThisMarkdownFile"), {
      description: uiText("theFileIsnTAmongTheVisibleNotesIn"),
    });
    return false;
  }

  if (usePages.getState().pages[pageId]?.localReadState === "error") {
    await usePages.getState().reloadLocalPageFromDisk(pageId);
  }
  await openPageInNotebook(notebook.id, pageId);
  return true;
}

async function openAssociatedMarkdownFilesSequentially(
  filePaths: string[],
): Promise<number> {
  const unique = [...new Set(filePaths.filter((value) => value.trim()))];
  if (unique.length === 0) return 0;

  let opened = 0;
  let firstPageId: string | null = null;
  let firstNotebookId: string | null = null;

  for (const filePath of unique) {
    const beforeActive = usePages.getState().activePageId;
    let ok = false;
    try {
      ok = await openAssociatedMarkdownFile(filePath);
    } catch (error) {
      toast.error(uiText("couldnTOpenThisMarkdownFile"), {
        description: error instanceof Error ? error.message : String(error),
      });
    }
    if (!ok) continue;
    opened += 1;
    const afterActive = usePages.getState().activePageId;
    if (afterActive && afterActive !== beforeActive && !firstPageId) {
      firstPageId = afterActive;
      firstNotebookId = usePages.getState().pages[afterActive]?.workspaceId ?? null;
    }
  }

  if (opened > 0) {
    markAssociatedMarkdownOpened();
  }

  if (opened > 1 && firstPageId && firstNotebookId) {
    await openPageInNotebook(firstNotebookId, firstPageId);
  }

  return opened;
}

let openQueue: Promise<unknown> = Promise.resolve();
export function openAssociatedMarkdownFiles(filePaths: string[]): Promise<number> {
  const task = openQueue.catch(() => {}).then(() => openAssociatedMarkdownFilesSequentially(filePaths));
  openQueue = task;
  return task;
}

export async function consumePendingAssociatedMarkdownFiles(): Promise<number> {
  const api = getGooseDesktop();
  if (!api?.takePendingOpenMarkdownFiles) return 0;
  try {
    const files = await api.takePendingOpenMarkdownFiles();
    if (!Array.isArray(files) || files.length === 0) return 0;
    return openAssociatedMarkdownFiles(files);
  } catch (error) {
    console.error("[open-md] 读取待打开文件失败", error);
    return 0;
  }
}
