import { EditorAction } from "@/components/editor/ui/button";
import React, { forwardRef } from "react";
import { cn } from "@/components/editor/utils/cn";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/editor/ui/tooltip";
import { Kbd } from "@/components/editor/ui/kbd";
import { isSlashMenuDivider, type SlashMenuItem } from "./blocknoteSlashItems";
import { useCustomSlashNavigation } from "./useCustomSlashNavigation";

interface CustomSlashMenuProps {
  items: SlashMenuItem[];
  loadingState: "loading-initial" | "loading" | "loaded";
  selectedIndex: number | undefined;
  onItemClick?: (item: SlashMenuItem) => void;
}

const CustomSlashMenu = forwardRef<HTMLDivElement, CustomSlashMenuProps>(
  ({ items, selectedIndex: externalIndex, onItemClick }, _ref) => {
    const {
      selectedIndex,
      setSelectedIndex,
      containerRef,
      suppressItemHover,
      ignoreMouseEnterUntilRef,
      selectItem,
    } = useCustomSlashNavigation(items, externalIndex, onItemClick);

    if (items.length === 0) {
      return null;
    }

    const lite = __GOOSE_EDITOR_COMPACT__;
    const needsTooltip = items.some(
      (item) =>
        !isSlashMenuDivider(item) && item.disabled && item.disabledReason,
    );

    const list = (
      <div className="goose-list-layout" data-goose-menu-slot="root">
        {items.map((item, index) => {
          if (isSlashMenuDivider(item)) return null;

          const itemKey = item.title ?? index;
          const button = (
            <EditorAction
              type="button"
              data-index={index}
              data-goose-menu-slot="row"
              data-keyboard-active={index === selectedIndex || undefined}
              data-goose-slash-item={lite ? "" : undefined}
              data-goose-slash-selected={
                lite && index === selectedIndex ? "true" : undefined
              }
              disabled={item.disabled}
              className="goose-menu-item goose-list-row goose-accent-selection flex w-full items-center text-left"
              onMouseEnter={() => {
                if (suppressItemHover) return;
                if (Date.now() < ignoreMouseEnterUntilRef.current) return;
                setSelectedIndex(index);
              }}
              onClick={() => selectItem(index)}
            >
              <span className="inline-flex size-4 shrink-0 items-center justify-center" aria-hidden="true">
                {item.icon ?? <span>T</span>}
              </span>
              <span className="min-w-0 flex-1 truncate">{item.title}</span>

              {item.badge && (
                <Kbd
                  shortcut={item.badge}
                  className="ml-2 h-4 border-transparent bg-transparent px-0 text-[12px] text-muted-foreground shadow-none"
                />
              )}
            </EditorAction>
          );

          if (!item.disabled || !item.disabledReason) {
            return <React.Fragment key={itemKey}>{button}</React.Fragment>;
          }
          return (
            <Tooltip key={itemKey}>
              <TooltipTrigger asChild>
                <span className="block w-full cursor-not-allowed">
                  {button}
                </span>
              </TooltipTrigger>
              <TooltipContent editorContext side="right">
                {item.disabledReason}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    );

    return (
      <div
        className="inline-flex max-h-[inherit] min-h-0 flex-col overflow-visible bg-transparent"
        data-notion-slash-root="true"
        {...(lite ? { "data-goose-slash-lite": "true" } : {})}
      >
        <div
          data-notion-slash-surface="true"
          className="goose-menu-surface z-50 flex h-auto max-h-[inherit] min-h-0 w-[280px] flex-col overflow-hidden text-popover-foreground"
        >
          <div
            ref={containerRef}
            data-notion-slash-scroll={lite ? "" : undefined}
            className={cn(
              "min-h-0 overflow-y-auto overscroll-contain",
              "max-h-[inherit]",
              suppressItemHover && "pointer-events-none",
            )}
          >
            {needsTooltip ? (
              <TooltipProvider delayDuration={600}>{list}</TooltipProvider>
            ) : (
              list
            )}
          </div>
        </div>
      </div>
    );
  },
);

CustomSlashMenu.displayName = "CustomSlashMenu";
export { CustomSlashMenu };
