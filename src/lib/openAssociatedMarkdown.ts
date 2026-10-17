import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/openAssociatedMarkdown.ts#localMessages:1">`
zh-Hans:
  couldnTOpenThisMarkdownFile: "无法打开该 Markdown 文件"
  theFileIsnTInsideAFolderThatCan: "文件不在可挂载的文件夹内。"
  theFileIsnTAmongTheVisibleNotesIn: "文件不在当前仓库的可见笔记中。"
en:
  couldnTOpenThisMarkdownFile: "Couldn’t open this Markdown file"
  theFileIsnTInsideAFolderThatCan: "The file isn’t inside a folder that can be opened as a notebook."
  theFileIsnTAmongTheVisibleNotesIn: "The file isn’t among the visible notes in the current repository."
`;
const uiText = createTranslator(localMessages);
import { activateWorkspace } from "@/lib/settings-navigation";
import { toast } from "@/components/ui/sonner";
import {
  comparisonLocalPath,
  isCanonicalPathInside,
  localPathsAreCaseInsensitive,
} from "@/lib/canonicalLocalPath";
import { pageDirectory } from "@/lib/currentLocalPagePath";
import { activateNotebook } from "@/lib/notebookNavigation";
import { closeNotebookAiIfFullscreen } from "@/pages/workspace/components/notebook-ai/useNotebookAiPanel";
import { getGooseDesktop } from "@/lib/electron/runtime";
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
  await activateNotebook(notebookId);
  useTabs.getState().openTab(pageId);
  usePages.getState().setActivePage(pageId);
  usePages.getState().setExpandPageId(pageId);
  const sidebar = useSidebarView.getState();
  sidebar.setSelected(notebookId, pageId);
  sidebar.setFocused(notebookId, pageId);
}

export async function openAssociatedMarkdownFile(
  filePath: string,
): Promise<boolean> {
  const trimmed = filePath.trim();
  if (!trimmed) return false;
  // 冷启动时恢复上次笔记的 effect 可能晚于这次打开，先占住选中，避免被盖掉。
  markAssociatedMarkdownOpened();

  let notebook = findContainingLocalFolderNotebook(
    trimmed,
    Object.values(useNotebooks.getState().notebooks),
  );

  if (!notebook) {
    const parentDir = pageDirectory(trimmed);
    if (!parentDir) {
      toast.error(uiText("couldnTOpenThisMarkdownFile"), {
        description: uiText("theFileIsnTInsideAFolderThatCan"),
      });
      return false;
    }
    const folderName = parentDir.split(/[\\/]/).pop() || "Notes";
    const notebookId = useNotebooks
      .getState()
      .createLocalFolderNotebook(folderName, parentDir);
    await usePages.getState().loadLocalFolderPages(notebookId, parentDir);
    notebook = useNotebooks.getState().notebooks[notebookId];
  } else if (notebook.localPath) {
    await usePages
      .getState()
      .loadLocalFolderPages(notebook.id, notebook.localPath);
    notebook = useNotebooks.getState().notebooks[notebook.id] ?? notebook;
  }

  if (!notebook) return false;

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

  await openPageInNotebook(notebook.id, pageId);
  return true;
}

export async function openAssociatedMarkdownFiles(
  filePaths: string[],
): Promise<number> {
  const unique = [...new Set(filePaths.filter((value) => value.trim()))];
  if (unique.length === 0) return 0;

  let opened = 0;
  let firstPageId: string | null = null;
  let firstNotebookId: string | null = null;

  for (const filePath of unique) {
    const beforeActive = usePages.getState().activePageId;
    const ok = await openAssociatedMarkdownFile(filePath);
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
