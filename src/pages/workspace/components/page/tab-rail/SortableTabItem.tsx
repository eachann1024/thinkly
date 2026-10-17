import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/page/tab-rail/SortableTabItem.tsx#localMessages:1">`
zh-Hans:
  newTab: "新标签页"
  missingPage: "页面已不存在"
  closeTab: "关闭标签页"
  revealInTree: "在文件树中定位"
  newWindow: "在新窗口打开"
  closeOtherTabs: "关闭其他标签页"
  closeLeftTabs: "关闭左侧标签页"
  closeRightTabs: "关闭右侧标签页"
  close: "关闭"
en:
  newTab: "New tab"
  missingPage: "This note no longer exists"
  closeTab: "Close tab"
  revealInTree: "Reveal in file tree"
  newWindow: "Open in new window"
  closeOtherTabs: "Close other tabs"
  closeLeftTabs: "Close tabs to the left"
  closeRightTabs: "Close tabs to the right"
  close: "Close"
ja:
  newTab: "新しいタブ"
  missingPage: "このノートは存在しません"
  closeTab: "タブを閉じる"
  revealInTree: "ファイルツリーで表示"
  newWindow: "新しいウィンドウで開く"
  closeOtherTabs: "他のタブを閉じる"
  closeLeftTabs: "左側のタブを閉じる"
  closeRightTabs: "右側のタブを閉じる"
  close: "閉じる"
`;
const uiText = createTranslator(localMessages);
import { IconButton } from "@/components/ui/icon-button";
import * as GooseIcons from "@/components/ui/icons";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useRef } from "react";
import type { Page } from "@/types";
import { type TabItem } from "@/stores/useTabs";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { cn } from "@/lib/utils";
import { PageFileTitle } from "../titlebar/PageFileTitle";
import { shouldHandleTabActivationKey, tabRailItemClassName, tabRailSelectionClassName } from "../tabRailLayout";
import { bindIdleWindowDrag } from "@/lib/electron/windowDrag";

import type { TabRailVariant } from "./types";

interface SortableTabItemProps {
  tab: TabItem;
  tabPage?: Page;
  tabCount: number;
  variant: TabRailVariant;
  isActive: boolean;
  hasLeftTabs: boolean;
  hasRightTabs: boolean;
  hasOtherTabs: boolean;
  closeTabShortcutLabel: string;
  dragEnabled: boolean;
  onActivate: () => void;
  onClose: () => void;
  onCloseOthers: () => void;
  onCloseLeft: () => void;
  onCloseRight: () => void;
  onPromotePreview: () => void;
  onLocateInTree?: () => void;
  onOpenInNewWindow?: () => void;
}

export function SortableTabItem({
  tab,
  tabPage,
  tabCount,
  variant,
  isActive,
  hasLeftTabs,
  hasRightTabs,
  hasOtherTabs,
  closeTabShortcutLabel,
  dragEnabled,
  onActivate,
  onClose,
  onCloseOthers,
  onCloseLeft,
  onCloseRight,
  onPromotePreview,
  onLocateInTree,
  onOpenInNewWindow,
}: SortableTabItemProps) {
  useLocale();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id, disabled: !dragEnabled });
  const windowDragStartedRef = useRef(false);
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };
  const title =
    tab.type === "welcome"
      ? uiText("newTab")
      : tabPage
        ? getPageTitle(tabPage)
        : uiText("missingPage");
  const electronNoDrag = variant === "electron-titlebar";
  const windowDragEnabled = !dragEnabled && variant === "electron-titlebar";
  const onWindowDragPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest("button, a, input, textarea")) return;
    if (dragEnabled) listeners?.onPointerDown?.(event);
    else if (windowDragEnabled) bindIdleWindowDrag(event, windowDragStartedRef);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          {...attributes}
          {...(dragEnabled ? listeners : {})}
          aria-disabled={undefined}
          role="tab"
          tabIndex={isActive ? 0 : -1}
          aria-selected={isActive}
          data-tab-id={tab.id}
          data-tab-count={tabCount}
          data-tab-active={isActive || undefined}
          data-tab-page-id={tab.pageId}
          data-tab-preview={tab.preview || undefined}
          data-electron-no-drag={electronNoDrag ? "" : undefined}
          data-electron-option-drag={windowDragEnabled ? "" : undefined}
          onPointerDown={onWindowDragPointerDown}
          onClick={onActivate}
          onDoubleClick={(event) => {
            if (!tab.preview) return;
            event.preventDefault();
            event.stopPropagation();
            onPromotePreview();
          }}
          onAuxClick={(e) => {
            if (e.button === 1) {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }
          }}
          onKeyDown={(event) => {
            if (shouldHandleTabActivationKey(event.key, event.target)) {
              event.preventDefault();
              onActivate();
            }
          }}
          className={cn(
            "group relative @container flex items-center gap-1 px-2 text-sm",
            tabCount > 1 && "goose-interactive",
            tabRailItemClassName(tabCount),
            tab.preview && "italic",
            isDragging && "cursor-grabbing",
            tabRailSelectionClassName(tabCount, isActive),
          )}
        >
          <span
            className={cn(
              "tab-rail-title inline-flex min-w-0 flex-1 items-center overflow-hidden no-underline",
              tab.preview && "italic text-muted-foreground",
            )}
          >
            {tabPage ? <PageFileTitle page={tabPage} /> : <span className="truncate">{title}</span>}
          </span>
          {tab.type !== "welcome" && (
          <TooltipProvider delayDuration={2000}>
            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton size="xs" tone="muted"
                  type="button"
                  className={cn(
                    "h-5 w-5 shrink-0 p-0 ",
                    tabPage
                      ? "invisible @[64px]:group-hover:visible @[64px]:group-focus-within:visible"
                      : "flex",
                    isActive
                      ? "text-muted-foreground "
                      : "text-muted-foreground ",
                  )}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    onClose();
                  }}
                  data-tab-close
                  aria-label={uiText("closeTab")}
                >
                  <GooseIcons.X className="h-3.5 w-3.5" />
                </IconButton>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <div className="flex items-center gap-2">
                  <span>{uiText("closeTab")}</span>
                  {closeTabShortcutLabel && (
                    <span className="text-[11px] text-muted-foreground">
                      {closeTabShortcutLabel}
                    </span>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {tab.type !== "welcome" && onLocateInTree && (
          <>
            <ContextMenuItem onSelect={onLocateInTree}>
              {uiText("revealInTree")}</ContextMenuItem>

          </>
        )}
        {onOpenInNewWindow ? (
          <ContextMenuItem onSelect={onOpenInNewWindow}>
            {uiText("newWindow")}</ContextMenuItem>
        ) : null}
        {hasOtherTabs && <ContextMenuItem onSelect={onCloseOthers}>
          {uiText("closeOtherTabs")}</ContextMenuItem>}
        {hasLeftTabs && <ContextMenuItem onSelect={onCloseLeft}>
          {uiText("closeLeftTabs")}</ContextMenuItem>}
        {hasRightTabs && <ContextMenuItem onSelect={onCloseRight}>
          {uiText("closeRightTabs")}</ContextMenuItem>}
        <ContextMenuItem onSelect={onClose}>
          {uiText("close")}{closeTabShortcutLabel && (
            <span className="goose-menu-shortcut">
              {closeTabShortcutLabel}
            </span>
          )}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
