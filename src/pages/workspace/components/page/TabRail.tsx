import { IconButton } from "@/components/ui/icon-button";
import * as GooseIcons from "@/components/ui/icons";
import { activateWorkspace } from "@/lib/settings-navigation";
import { useTabs } from "@/stores/useTabs";
import { isFullscreenAiLayout } from "@/pages/workspace/components/notebook-ai/useNotebookAiPanel";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { cn } from "@/lib/utils";
import { NewTabButton } from "./NewTabButton";
import { tabRailListClassName } from "./tabRailLayout";
import { useFolderToolbarActions } from "./useFolderToolbarActions";

import { useTabRail } from "./tab-rail/useTabRail";
import { SortableTabItem } from "./tab-rail/SortableTabItem";
import { tabRailPageId } from "./tab-rail/model";
import type { TabRailProps } from "./tab-rail/types";
export type { TabRailVariant } from "./tab-rail/types";

export function TabRail({
  variant,
  page,
  onOpenSearch,
  onBeforeActivateTab,
  aiPanelOpen,
  aiLayoutMode = "fullscreen",
}: TabRailProps) {
  const folderActionsAvailable = useFolderToolbarActions();
  const {
    visibleTabs, focusedPageByTabId, getPage,
    activeTabId, isOverflowing, tabsScrollerRef,
    dragEnabled, insertLeft, sensors,
    handleTabDragStart, handleTabDragMove, handleTabDragCancel,
    handleTabDragEnd, closeTabShortcutLabel,
    canOpenInNewWindow, setActiveTab, closeTab,
    promotePreviewTab, locateInTree,
    openTabInNewWindow, handleTabListKeyDown,
    openTabs,
  } = useTabRail({ variant, onBeforeActivateTab });

  const tabItems = (
    <>
      {visibleTabs.map((tab, visibleIndex) => {
        const displayPageId = tabRailPageId(tab, focusedPageByTabId);
        const tabPage =
          tab.type === "welcome" ? undefined : getPage(displayPageId);
        const closableOtherTabs = visibleTabs.filter((item) => item.id !== tab.id);
        const closableLeftTabs = visibleTabs.slice(0, visibleIndex);
        const closableRightTabs = visibleTabs.slice(visibleIndex + 1);
        return (
          <SortableTabItem
            key={tab.id}
            tab={{ ...tab, pageId: displayPageId }}
            tabPage={tabPage}
            tabCount={visibleTabs.length}
            variant={variant}
            isActive={
              activeTabId === tab.id &&
              !(aiPanelOpen && isFullscreenAiLayout(aiLayoutMode))
            }
            hasLeftTabs={closableLeftTabs.length > 0}
            hasRightTabs={closableRightTabs.length > 0}
            hasOtherTabs={closableOtherTabs.length > 0}
            closeTabShortcutLabel={closeTabShortcutLabel}
            dragEnabled={dragEnabled}
            onActivate={() => {
              onBeforeActivateTab?.();
              setActiveTab(tab.id);
            }}
            onClose={() => { activateWorkspace(); closeTab(tab.id); }}
            onCloseOthers={() => {
              activateWorkspace();
              closableOtherTabs.forEach((item) => closeTab(item.id));
            }}
            onCloseLeft={() => {
              activateWorkspace();
              closableLeftTabs.forEach((item) => closeTab(item.id));
            }}
            onCloseRight={() => {
              activateWorkspace();
              closableRightTabs.forEach((item) => closeTab(item.id));
            }}
            onPromotePreview={() => promotePreviewTab(tab.id)}
            onLocateInTree={() => locateInTree(displayPageId)}
            onOpenInNewWindow={
              canOpenInNewWindow(tab) ? () => void openTabInNewWindow(tab) : undefined
            }
          />
        );
      })}
    </>
  );

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <div
        ref={tabsScrollerRef}
        role="tablist"
        aria-label="打开的标签页"
        className={cn(
          "relative @container min-w-0 flex-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          tabRailListClassName(visibleTabs.length),
        )}
        onKeyDown={handleTabListKeyDown}
        onDoubleClick={(e) => {
          if (variant === "electron-titlebar") return;
          if (e.target === e.currentTarget) {
            onBeforeActivateTab?.();
            useTabs.getState().openNewTab();
          }
        }}
      >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleTabDragStart}
        onDragMove={handleTabDragMove}
        onDragCancel={handleTabDragCancel}
        onDragEnd={handleTabDragEnd}
      >
        <SortableContext
          items={visibleTabs.map((tab) => tab.id)}
          strategy={horizontalListSortingStrategy}
        >
          {tabItems}
        </SortableContext>
      </DndContext>
      {insertLeft != null && (
        <div
          aria-hidden
          className="pointer-events-none absolute top-1 bottom-1 z-20 w-0.5 rounded-marker bg-[var(--goose-accent-solid)] motion-reduce:transition-none"
          style={{ left: insertLeft }}
        />
      )}

      {openTabs.length === 0 && page && (
        <span className="truncate text-sm text-foreground">
          {getPageTitle(page)}
        </span>
      )}
    </div>

      {!page?.trashedAt && (
        <div
          className="flex shrink-0 items-center gap-0.5"
          data-electron-no-drag={
            variant === "electron-titlebar" ? "" : undefined
          }
        >
          {folderActionsAvailable && <NewTabButton onClick={onOpenSearch} />}
          {isOverflowing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton size="sm" tone="muted"
                  type="button"
                  className="inline-flex shrink-0 items-center justify-center text-muted-foreground "
                  aria-label="全部标签页"
                >
                  <GooseIcons.ChevronDown
                    className="h-3.5 w-3.5"
                    strokeWidth={1.75}
                  />
                </IconButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[220px] outline-none"
                align="end"
                sideOffset={6}
              >
                {visibleTabs.map((tab) => {
                  const displayPageId = tabRailPageId(tab, focusedPageByTabId);
                  const tabPage =
                    tab.type === "welcome" ? undefined : getPage(displayPageId);
                  const title =
                    tab.type === "welcome"
                      ? "新标签页"
                      : tabPage
                        ? getPageTitle(tabPage)
                        : "页面已不存在";
                  const isActive =
                    activeTabId === tab.id &&
                    !(aiPanelOpen && isFullscreenAiLayout(aiLayoutMode));
                  return (
                    <DropdownMenuItem
                      key={tab.id}
                      aria-selected={isActive}
                      className={cn(
                        "goose-interactive flex items-center gap-2 text-[13px]",
                        isActive &&
                          "bg-[var(--goose-interactive-selected)] text-[var(--goose-interactive-selected-fg)]",
                      )}
                      onSelect={() => {
                        onBeforeActivateTab?.();
                        setActiveTab(tab.id);
                        setTimeout(() => {
                          const scroller = tabsScrollerRef.current;
                          if (!scroller) return;
                          const el = scroller.querySelector<HTMLElement>(
                            `[data-tab-id="${tab.id}"]`,
                          );
                          el?.scrollIntoView({
                            inline: "nearest",
                            block: "nearest",
                          });
                        }, 0);
                      }}
                    >
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate",
                          tab.preview && "italic text-muted-foreground",
                        )}
                      >
                        {title}
                      </span>
                      {isActive && (
                        <GooseIcons.Check
                          className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                          strokeWidth={1.75}
                        />
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </div>
  );
}
