import { useLocale, createTranslator, getFormatLocale, i18nYaml } from "@/i18n";
const localMessages = i18nYaml<"src/pages/workspace/components/page/PageMenu.tsx#localMessages:1">`
zh-Hans:
  wordCount: "字数：{{count}}"
  editedAt: "编辑于 {{date}}"
  moreActions: "更多操作"
  lockNote: "锁定笔记"
  newWindow: "在新窗口打开"
  import: "导入"
  exportSelectionImage: "导出所选为图片"
  exportImage: "导出为图片"
  versionHistory: "历史版本"
  moveSystemTrash: "移到废纸篓"
  moveSystemRecycle: "移到系统回收站"
  moveTrash: "移入回收站"
en:
  wordCount: "Word count: {{count}}"
  editedAt: "Edited {{date}}"
  moreActions: "More actions"
  lockNote: "Lock note"
  newWindow: "Open in new window"
  import: "Import"
  exportSelectionImage: "Export selection as image"
  exportImage: "Export as image"
  versionHistory: "Version history"
  moveSystemTrash: "Move to Trash"
  moveSystemRecycle: "Move to Recycle Bin"
  moveTrash: "Move to Trash"
ja:
  import: "インポート"
  wordCount: "文字数：{{count}}"
  editedAt: "{{date}} に編集"
  moreActions: "その他の操作"
  lockNote: "ノートをロック"
  newWindow: "新しいウィンドウで開く"
  exportSelectionImage: "選択範囲を画像として書き出す"
  exportImage: "画像として書き出す"
  versionHistory: "バージョン履歴"
  moveSystemTrash: "ゴミ箱に移動"
  moveSystemRecycle: "システムのごみ箱に移動"
  moveTrash: "ゴミ箱に移動"
`;
const uiText = createTranslator(localMessages);
import { IconButton } from "@/components/ui/icon-button";
import * as GooseIcons from "@/components/ui/icons";
import { Popover, PopoverTrigger, PopoverContent, PopoverAction } from "@/components/ui/popover";
import { FontSelector } from "@/pages/workspace/components/shared/FontSelector";
import "./page-menu.css";
import { ImageExportThemeSelector } from "@/components/ui/image-export-theme-selector";
import { useHistoryView } from "@/stores/useHistoryView";
import { deletePageWithUndo } from "@/lib/page-delete-actions";
import { getPlatformKind } from "@/lib/utils";
import { createDesktopWindow } from "@/lib/electron/windowContext";
import { detachTabFromThisWindow } from "@/lib/electron/detachTab";
import { PageExportSubmenu } from "./page-menu/PageExportSubmenu";
import { PageWidthSelector } from "./page-menu/PageWidthSelector";
import { usePageMenu } from "./page-menu/usePageMenu";
export function PageMenu() {
  useLocale();
  const {
    page, activePageId, viewport,
    defaultLayout, themeSelectorOpen, setThemeSelectorOpen,
    pageMenuOpen, setPageMenuOpen, selectedBlocks,
    isLocalItem, activeTab, canOpenInNewWindow,
    captureSelectedBlocks, handleImport, runExport,
    handleThemeConfirm, updatePage,
  } = usePageMenu();

  if (!page || !activePageId) return null;

  return (
    <>
      <Popover
        onOpenChange={(open) => {
          setPageMenuOpen(open);
          if (open) captureSelectedBlocks();
        }}
      >
        <PopoverTrigger asChild>
          <IconButton size="icon" tone="muted"
            aria-label={uiText("moreActions")}
            onPointerDownCapture={captureSelectedBlocks}
            className="text-muted-foreground "
          >
            <GooseIcons.MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">{uiText("moreActions")}</span>
          </IconButton>
        </PopoverTrigger>
        {/*
          不要在定位外壳上挂 goose-editor-context-ui（CSS zoom）。
          Electron 旧内核会把 zoom 祖先的 getBoundingClientRect 再次放大，
          导致导出子菜单相对「导出」触发项下漂，中间出现无法穿越的空隙。
          页面更多菜单走 viewport 坐标系，尺寸用真实 px。
        */}
        <PopoverContent
          variant="menu"
          className="goose-page-menu-surface goose-floating-surface goose-list-layout max-h-[calc(100vh-24px)] w-[272px] max-w-[calc(100vw-16px)] overflow-y-auto p-1.5"
          align="end"
          sideOffset={6}
          style={{
            maxHeight:
              viewport.height <= 0
                ? undefined
                : `${Math.max(160, viewport.height - 24)}px`,
            maxWidth:
              viewport.width <= 0
                ? undefined
                : `${Math.max(160, viewport.width - 16)}px`,
          }}
          forceMount
        >
          {/* Font Selector */}
          <div className="pb-1.5">
            <FontSelector
              value={page.fontFamily}
              compact
              onChange={(fontFamily) =>
                updatePage(activePageId, { fontFamily })
              }
            />
          </div>

          {!page.isFolder && (
            <div className="pb-1.5">
              <PageWidthSelector
                pageLayout={page.pageLayout}
                defaultLayout={defaultLayout}
                onChange={(pageLayout) => updatePage(activePageId, { pageLayout })}
              />
            </div>
          )}

          <div
            role="button"
            tabIndex={0}
            className="goose-menu-item goose-list-row group grid min-h-[32px] cursor-pointer grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-x-2 rounded-[var(--goose-control-radius)] px-2 text-xs "
            onClick={() =>
              updatePage(activePageId, { isLocked: !page.isLocked })
            }
            onKeyDown={(e) => {
              if (e.target !== e.currentTarget) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                updatePage(activePageId, { isLocked: !page.isLocked });
              }
            }}
          >
            <GooseIcons.Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 truncate">{uiText("lockNote")}</span>
            <Switch
              aria-label={uiText("lockNote")}
              checked={page.isLocked}
              onCheckedChange={(checked) =>
                updatePage(activePageId, { isLocked: checked })
              }
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {canOpenInNewWindow && activeTab ? (
            <PopoverAction
              className="group grid min-h-[32px] grid-cols-[16px_minmax(0,1fr)] gap-x-2 px-2 text-xs"
              onSelect={() => {
                void (async () => {
                  const created = await createDesktopWindow({
                    mode: "currentTab",
                    tab: {
                      id: activeTab.id,
                      pageId: activeTab.pageId,
                      type: activeTab.type,
                      workspaceId: activeTab.workspaceId,
                    },
                  });
                  if (created?.windowId) {
                    detachTabFromThisWindow(activeTab.id, created.windowId);
                  }
                })();
              }}
            >
              <GooseIcons.AppWindow className="h-3.5 w-3.5 text-muted-foreground group-focus:text-[var(--goose-interactive-selected-fg)]" />
              <span className="min-w-0 truncate">{uiText("newWindow")}</span>
            </PopoverAction>
          ) : null}

          {/* Import */}
          <div>
            <PopoverAction
              className="group grid min-h-[32px] grid-cols-[16px_minmax(0,1fr)] gap-x-2 px-2 text-xs"
              onSelect={handleImport}
            >
              <GooseIcons.Upload className="h-3.5 w-3.5 text-muted-foreground group-focus:text-[var(--goose-interactive-selected-fg)]" />
              <span className="min-w-0 truncate">{uiText("import")}</span>
            </PopoverAction>
          </div>

          {/* Generate Image — standalone, before Export */}
          <PopoverAction
            className="group grid min-h-[32px] grid-cols-[16px_minmax(0,1fr)] gap-x-2 px-2 text-xs"
            onSelect={() => {
              setThemeSelectorOpen(true);
            }}
          >
            <GooseIcons.Image className="h-3.5 w-3.5 text-muted-foreground group-focus:text-[var(--goose-interactive-selected-fg)]" />
            <span className="min-w-0 truncate">
              {selectedBlocks.length > 0 ? uiText("exportSelectionImage") : uiText("exportImage")}
            </span>
          </PopoverAction>

          {/* Export submenu */}
          <div className="goose-list-group w-full">
            <PageExportSubmenu
              enabled={pageMenuOpen}
              viewportHeight={viewport.height}
              onExportMarkdown={() =>
                runExport("Markdown", () => exportToMarkdown(page))
              }
              onExportHtml={() => runExport("HTML", () => exportToHTML(page))}
              onExportWord={() => runExport("Word", () => exportToWord(page))}
              onExportPdf={() => runExport("PDF", () => exportToPDF(page))}
            />

            <PopoverAction
              className="group grid min-h-[32px] grid-cols-[16px_minmax(0,1fr)] gap-x-2 px-2 text-xs"
              disabled={page?.isFolder}
              onSelect={() => {
                const pid = activePageId;
                // 进入历史模式前 flush，避免 200ms debounce 内的最新编辑丢失
                try {
                  flushEditorContent(true);
                } catch {
                  /* ignore */
                }
                setTimeout(() => {
                  useHistoryView.getState().enter(pid);
                }, 80);
              }}
            >
              <GooseIcons.History className="h-3.5 w-3.5 text-muted-foreground group-focus:text-[var(--goose-interactive-selected-fg)]" />
              <span className="min-w-0 truncate">{uiText("versionHistory")}</span>
            </PopoverAction>
          </div>

          <PopoverAction
            className="group grid min-h-[32px] grid-cols-[16px_minmax(0,1fr)] gap-x-2 px-2 text-xs text-foreground hover:text-[var(--goose-color-danger-focus)] focus:text-[var(--goose-color-danger-focus)]"
            onClick={() => void deletePageWithUndo(activePageId)}
          >
            {isLocalItem ? (
              <GooseIcons.FileX className="h-3.5 w-3.5 text-muted-foreground group-focus:text-[var(--goose-color-danger-focus)]" />
            ) : (
              <GooseIcons.Trash2 className="h-3.5 w-3.5 text-muted-foreground group-focus:text-[var(--goose-color-danger-focus)]" />
            )}
            <span className="min-w-0 truncate">
              {isLocalItem ? uiText(getPlatformKind() === "windows" ? "moveSystemRecycle" : "moveSystemTrash") : uiText("moveTrash")}
            </span>
          </PopoverAction>

          <div className="flex items-center justify-between gap-3 px-2 py-1 text-[10px] text-muted-foreground">
            <span>{uiText("wordCount", {count: countWords(page.content)})}</span>
            <span className="min-w-0 truncate text-right">
              {uiText("editedAt", {date: new Date(page.updatedAt).toLocaleString(getFormatLocale())})}
            </span>
          </div>
        </PopoverContent>
      </Popover>

      <ImageExportThemeSelector
        open={themeSelectorOpen}
        onOpenChange={setThemeSelectorOpen}
        onConfirm={handleThemeConfirm}
        mode={selectedBlocks.length > 0 ? "selection" : "page"}
        page={page}
        blocks={selectedBlocks}
      />
    </>
  );
}
