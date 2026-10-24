import { useLocale } from "@/i18n";
import { formatNumber, formatRelativeDate } from "@/i18n/format";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/page/FolderHomePage.tsx#localMessages:1">`
zh-Hans:
  itemCount: "{{count}} 个子项"
  createFirst: "在「{{folder}}」里创建第一个文件或子文件夹"
  local: "本地"
  folderFailed: "新建文件夹失败：名称已存在或无写入权限"
  folderCreated: "已新建文件夹"
  contents: "内容"
  newSubfolder: "新建子文件夹"
  newFile: "新建文件"
  emptyFolder: "这个文件夹还是空的"
en:
  itemCount: "Items: {{count}}"
  createFirst: "Create your first file or subfolder in {{folder}}"
  local: "Local"
  folderFailed: "Couldn’t create the folder: the name is already in use or you don’t have write permission"
  folderCreated: "Folder created"
  contents: "Contents"
  newSubfolder: "New subfolder"
  newFile: "New file"
  emptyFolder: "This folder is empty"
ja:
  itemCount: "{{count}} 個の項目"
  createFirst: "「{{folder}}」に最初のファイルまたはサブフォルダを作成"
  local: "ローカル"
  folderFailed: "フォルダを作成できませんでした：名前がすでに使われているか、書き込み権限がありません"
  folderCreated: "フォルダを作成しました"
  contents: "内容"
  newSubfolder: "新規サブフォルダ"
  newFile: "新規ファイル"
  emptyFolder: "このフォルダは空です"
`;
const uiText = createTranslator(localMessages);
import { Button } from "@/components/ui/button";
import { DotDecor, FolderEmptyArt } from "@/components/ui/dot-matrix";
import { useMemo, useState } from "react";
import type { Page } from "@/types";
import {
  FolderOpen,
  FolderPlus,
  FilePlus2,
  FileText,
  Folder,
  Loader2,
} from "@/components/ui/icons";
import { toast } from "@/components/ui/sonner";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { presenceName } from "@/lib/ui/presence";
import { usePages } from "@/stores/usePages";
import { useNotebooks } from "@/stores/useNotebooks";
import { useTabs } from "@/stores/useTabs";
import { useSidebarView } from "@/stores/useSidebarView";
import { useStoreWithEqualityFn } from "zustand/traditional";
import { areSidebarPagesEqual } from "@/stores/pages/areSidebarPagesEqual";
import {
  sortLocalFolderChildren,
  useLocalFolderOrders,
} from "@/stores/localFolderOrder";

interface FolderHomePageProps {
  page: Page;
}



export function FolderHomePage({ page }: FolderHomePageProps) {
  useLocale();
  const pages = useStoreWithEqualityFn(
    usePages,
    (s) => s.pages,
    areSidebarPagesEqual,
  );
  const createLocalPage = usePages((s) => s.createLocalPage);
  const createLocalFolderRecord = usePages((s) => s.createLocalFolderRecord);
  const setExpandPageId = usePages((s) => s.setExpandPageId);
  const expandView = useSidebarView((s) => s.expand);
  const openPreviewTab = useTabs((s) => s.openPreviewTab);
  const notebookName = useNotebooks(
    (s) => s.notebooks[page.workspaceId]?.name ?? uiText("local"),
  );
  const [creating, setCreating] = useState<"file" | "folder" | null>(null);

  const manualOrders = useLocalFolderOrders(
    (s) => s.ordersByNotebook[page.workspaceId],
  );
  const children = useMemo(
    () =>
      sortLocalFolderChildren(
        Object.values(pages).filter(
          (p) => p.parentId === page.id && !p.trashedAt,
        ),
        manualOrders?.[page.id],
      ),
    [pages, page.id, manualOrders],
  );

  const folderName = getPageTitle(page);

  const handleCreateFile = async () => {
    if (creating) return;
    setCreating("file");
    try {
      const newId = await createLocalPage(page.id, page.workspaceId);
      if (!newId) return;
      expandView(page.workspaceId, page.id);
    } finally {
      setCreating(null);
    }
  };

  const handleCreateFolder = async () => {
    if (creating) return;
    setCreating("folder");
    try {
      const newId = await createLocalFolderRecord({
        workspaceId: page.workspaceId,
        parentId: page.id,
      });
      if (!newId) {
        toast.error(uiText("folderFailed"));
        return;
      }
      expandView(page.workspaceId, page.id);
      setExpandPageId(newId);
      toast.success(uiText("folderCreated"));
    } finally {
      setCreating(null);
    }
  };

  const handleOpenChild = (child: Page) => {
    openPreviewTab(child.id);
  };

  const count = children.length;

  return (
    <div className="workspace-folder-home flex min-h-0 flex-1 flex-col overflow-hidden bg-[hsl(var(--goose-editor-bg))]">
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-8 py-8 md:px-12 md:py-10">
        { }
        <div className="mb-6 flex shrink-0 items-center gap-3.5">
          <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[13px] bg-[hsl(var(--goose-selected-bg))] text-muted-foreground">
            <FolderOpen className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-[22px] font-bold leading-tight text-foreground">
              {folderName}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {notebookName} / {folderName} · {uiText("itemCount", {count: formatNumber(count)})}
            </p>
          </div>
        </div>

        { }
        <div className="mb-2.5 flex shrink-0 items-center gap-2.5">
          <h2 className="text-[13px] font-semibold text-muted-foreground">
            {uiText("contents")}<span className="ml-1.5 rounded-control bg-[hsl(var(--goose-selected-bg))] px-2 py-0.5 text-[10.5px] font-semibold text-muted-foreground">
              {count}
            </span>
          </h2>
          <span className="flex-1" />
          <Button contentStyle="preserve" variant="ghost" size={null}
            type="button"
            onClick={() => void handleCreateFolder()}
            disabled={creating !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground transition-colors disabled:text-disabled"
          >
            {creating === "folder" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FolderPlus className="h-3.5 w-3.5" />
            )}
            {uiText("newSubfolder")}</Button>
          <Button contentStyle="preserve" variant="ghost" size={null}
            type="button"
            onClick={() => void handleCreateFile()}
            disabled={creating !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground transition-colors disabled:text-disabled"
          >
            {creating === "file" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FilePlus2 className="h-3.5 w-3.5" />
            )}
            {uiText("newFile")}</Button>
        </div>

        {count === 0 ? (
          <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-1 overflow-hidden rounded-[11px] border border-dashed border-border bg-background px-5 pb-10 pt-11 text-center [&>:not(.goose-dm-decor)]:relative">
            <DotDecor preset="folder" />
            <FolderEmptyArt className="mb-2 text-foreground" />
            <p className="m-0 text-sm font-semibold text-foreground">
              {uiText("emptyFolder")}</p>
            <p className="m-0 mb-3 text-xs text-muted-foreground">
              {uiText("createFirst", {folder: folderName})}
            </p>
            <div className="flex gap-2">
              <Button contentStyle="preserve" variant="ghost" size={null}
                type="button"
                onClick={() => void handleCreateFile()}
                disabled={creating !== null}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground transition-colors disabled:text-disabled"
              >
                <FilePlus2 className="h-3.5 w-3.5" />
                {uiText("newFile")}</Button>
              <Button contentStyle="preserve" variant="ghost" size={null}
                type="button"
                onClick={() => void handleCreateFolder()}
                disabled={creating !== null}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground transition-colors disabled:text-disabled"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                {uiText("newSubfolder")}</Button>
            </div>
          </div>
        ) : (
          <div className="goose-list-layout folder-home-list page-scroll-container min-h-0 flex-1 overflow-y-auto rounded-[11px] border border-border bg-background">
            {children.map((child) => (
              <Button contentStyle="preserve" variant="ghost" size={null}
                key={child.id}
                type="button"
                style={{ viewTransitionName: presenceName("home", child.id) }}
                onClick={() => handleOpenChild(child)}
                className="goose-list-row flex w-full items-center justify-start gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-foreground"
              >
                {child.isFolder ? (
                  <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-0 flex-1 truncate">
                  {getPageTitle(child)}
                  {!child.isFolder && (
                    <span className="text-muted-foreground">.md</span>
                  )}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {formatRelativeDate(child.updatedAt)}
                </span>
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
