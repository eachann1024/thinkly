import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/main-tree/row/renderItem.tsx#localMessages:1">`
zh-Hans:
  fileName_d2e2: "文件名称"
  untitled_44a7: "无标题"
  noFilesYet_4b78: "暂无文件"
en:
  fileName_d2e2: "File name"
  untitled_44a7: "Untitled"
  noFilesYet_4b78: "No files yet"
ja:
  fileName_d2e2: "ファイル名"
  untitled_44a7: "無題"
  noFilesYet_4b78: "ファイルはまだありません"
`;
const uiText = createTranslator(localMessages);
import { TreeBranch } from "../TreeBranch";
import { WorkspaceDotIcon } from "@/components/ui/dot-matrix";
import { type HTMLProps } from "react";
import { SidebarContextMenu } from "../../SidebarContextMenu";
import { SidebarInlineRename } from "../../SidebarInlineRename";
import {
  isSidebarFolderRow,
  shouldShowEmptyFolderPlaceholder,
} from "../../local-file-icon";
import { useNotebooks } from "@/stores/useNotebooks";
import { toggleSidebarFolder } from "@/stores/useSidebarView";
import { openPageFromSidebar } from "@/lib/sidebarPageNavigation";
import {
  INDENT,
  ROW_PADDING_LEFT,
  CHILD_TITLE_OFFSET,
  type RenderItemArgs,
} from "./mainTreeRowConfig";
import { TreeRowIcon, MainTreeRow } from "./MainTreeRow";
import { PendingCreateNameInput } from "./PendingCreateNameInput";
import { MainTreeRowTitle } from "./MainTreeRowTitle";
import { writeFolderDrag, writePageDrag } from "@/lib/workspace-drag";
import { isPlatformPrimaryModifierEvent } from "@/lib/shortcut-platform";

export let activeMainTreeDragId: string | null = null;

export function renderItem({
  item,
  depth,
  children,
  arrow,
  context,
  onCreateLocalFile,
  onCreateLocalFolder,
  onCommitPendingCreate,
  onCancelPendingCreate,
  onItemDragStart,
  onItemDragEnd,
}: RenderItemArgs) {
  const page = item.data;
  if (item.index === "root") {
    return <>{children}</>;
  }
  const isActive = !!context.isSelected;
  const isOver = !!context.isDraggingOver;
  const interactive =
    context.interactiveElementProps as HTMLProps<HTMLDivElement>;
  const withChildren =
    context.itemContainerWithChildrenProps as HTMLProps<HTMLLIElement>;
  const withoutChildren =
    context.itemContainerWithoutChildrenProps as HTMLProps<HTMLDivElement>;

  const title = page.localPendingCreate === "file" ? uiText("fileName_d2e2") : getPageTitle(page);
  const notebook = page?.workspaceId
    ? useNotebooks.getState().notebooks[page.workspaceId]
    : undefined;
  const isLocalFolder = notebook?.source === "local-folder";
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
  const isPendingCreate =
    page.localPendingCreate === "folder" || page.localPendingCreate === "file";
  const isLocalDirectory = isLocalFolder && !!page.isFolder;
  const isDragging = activeMainTreeDragId === String(item.index);
  const isFolderRow = isSidebarFolderRow({
    isFolder: !!page.isFolder,
    hasChildren,
    isLocalNotebook: isLocalFolder,
  });
  const showEmptyFolderPlaceholder = shouldShowEmptyFolderPlaceholder({
    isFolderRow,
    isExpanded: !!context.isExpanded,
    hasChildren,
    isLocalNotebook: isLocalFolder,
    localLoadStatus: isLocalFolder
      ? useNotebooks.getState().localFolderLoadStates[page.workspaceId]?.status
      : undefined,
  });
  const iconNode = (
    <TreeRowIcon
      page={page}
      isLocalFolder={isLocalFolder}
      isRenaming={!!context.isRenaming}
      hasChildren={hasChildren}
      isExpanded={!!context.isExpanded}
      onToggleExpanded={() =>
        toggleSidebarFolder(page.workspaceId, String(item.index))
      }
    />
  );

  const handleDragStart: React.DragEventHandler<HTMLDivElement> = (e) => {
    if (!e.dataTransfer) return;
    activeMainTreeDragId = String(item.index);
    onItemDragStart?.(String(item.index));
    (
      interactive.onDragStart as
        | React.DragEventHandler<HTMLDivElement>
        | undefined
    )?.(e);
    if (!isPendingCreate && page.isFolder) {
      writeFolderDrag(e.dataTransfer, page.id);
    }
    if (!isPendingCreate && !page.isFolder) {
      writePageDrag(e.dataTransfer, page.id);
    }
    if (page.localFilePath && !isPendingCreate && !page.localUnsaved) {
      e.dataTransfer.setData("text/plain", page.localFilePath);
      e.dataTransfer.effectAllowed = "copyMove";
    }

    const rowEl = (e.currentTarget as HTMLElement)
      .closest("li")
      ?.querySelector(".main-tree-row");
    const ghost = document.createElement("canvas");
    ghost.width = ghost.height = 1;
    const folderGhost = page.isFolder ? document.createElement("div") : null;
    if (folderGhost) {
      folderGhost.className = "main-tree-drag-ghost";
      const iconSvg = rowEl?.querySelector(".main-tree-row-icon-slot svg");
      if (iconSvg) folderGhost.appendChild(iconSvg.cloneNode(true));
      const label = document.createElement("span");
      label.textContent = title || uiText("untitled_44a7");
      folderGhost.appendChild(label);
    }
    const dragImage = folderGhost ?? ghost;
    dragImage.style.position = "fixed";
    dragImage.style.top = "-1000px";
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, folderGhost ? 18 : 0, folderGhost ? 17 : 0);
    window.setTimeout(() => dragImage.remove(), 0);

    if (rowEl instanceof HTMLElement) {
      rowEl.classList.add("main-tree-row--dragging", "main-tree-row--selected");
    }
    e.currentTarget.addEventListener(
      "dragend",
      () => {
        activeMainTreeDragId = null;
        onItemDragEnd?.();
        if (rowEl instanceof HTMLElement) {
          rowEl.classList.remove("main-tree-row--dragging");
        }
      },
      { once: true },
    );
  };

  const toggleLocalDirectory = () => {
    toggleSidebarFolder(page.workspaceId, String(item.index));
  };

  const handleRowPointerDown: React.PointerEventHandler<HTMLDivElement> = (
    e,
  ) => {
    (
      interactive.onPointerDown as
        | React.PointerEventHandler<HTMLDivElement>
        | undefined
    )?.(e);
    if (!isLocalDirectory) return;
    if (e.button !== 0 || e.ctrlKey) return;
    if (e.detail <= 1) toggleLocalDirectory();
  };

  const handleRowClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (isLocalDirectory) {
      e.preventDefault();
      e.stopPropagation();
      if (e.detail === 0) toggleLocalDirectory();
      return;
    }
    (
      interactive.onClick as React.MouseEventHandler<HTMLDivElement> | undefined
    )?.(e);
    const pageId = String(item.index);
    if (pageId && pageId !== "root") {
      const permanent = isPlatformPrimaryModifierEvent(e);
      openPageFromSidebar(pageId, permanent ? "permanent" : "preview", {
        newTab: permanent,
      });
    }
  };

  const row = (
    <MainTreeRow
      withoutChildren={withoutChildren}
      isLocalFolder={isLocalFolder}
      isPendingCreate={isPendingCreate}
      isActive={isActive}
      isOver={isOver}
      isDragging={isDragging}
      depth={depth}
      itemIndex={String(item.index)}
    >
      {
}
      <div
        {...interactive}
        data-main-tree-folder={item.isFolder ? "true" : "false"}
        onClick={handleRowClick}
        onPointerDown={handleRowPointerDown}
        onDragStart={handleDragStart}
        onDoubleClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isLocalDirectory) return;
          openPageFromSidebar(String(item.index), "permanent");
        }}
        aria-label={title}
        className={cn(
          "absolute inset-0 rounded-lg outline-none",
          isPendingCreate && "pointer-events-none",
        )}
      />
      {iconNode}
      {isPendingCreate ? (
        <PendingCreateNameInput
          key={page.id}
          id={String(item.index)}
          kind={page.localPendingCreate === "file" ? "file" : "folder"}
          onCommit={onCommitPendingCreate}
          onCancel={onCancelPendingCreate}
        />
      ) : (
        <SidebarInlineRename>
          <MainTreeRowTitle
            title={title}
            count={isFolderRow ? item.children?.length ?? 0 : 0}
          />
        </SidebarInlineRename>
      )}
    </MainTreeRow>
  );

  return (
    <li {...withChildren} className="list-none">
      <SidebarContextMenu
        page={page}
        isFolderRow={isFolderRow}
        onCreateLocalFile={onCreateLocalFile}
        onCreateLocalFolder={onCreateLocalFolder}
      >
        {row}
      </SidebarContextMenu>
      <TreeBranch
        expanded={!!context.isExpanded}
        onReturnFocus={() => context.focusItem(true)}
      >
        {children}
        {showEmptyFolderPlaceholder ? (
          <div
            className="flex items-center gap-2 text-[13px] text-muted-foreground"
            style={{
              paddingLeft:
                (depth + 1) * INDENT + ROW_PADDING_LEFT + CHILD_TITLE_OFFSET - 22,
              minHeight: "var(--main-tree-row-height)",
            }}
          >
            <WorkspaceDotIcon icon="dots" size={14} motion="ripple" className="shrink-0 text-foreground" />
            {uiText("noFilesYet_4b78")}</div>
        ) : null}
      </TreeBranch>
    </li>
  );
}
