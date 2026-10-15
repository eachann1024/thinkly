import type { ReactNode } from "react";
import { useBlockNoteEditor } from "@blocknote/react";
import { MoreHorizontal } from "@/components/ui/icons";
import { Button } from "@/components/editor/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/editor/ui/popover";
import { Tooltip, TooltipTrigger } from "@/components/editor/ui/tooltip";
import { ToolbarTooltip, type BindTooltip } from "./ToolbarTooltip";
import {
  useSelectionMenu,
  type RunToolbarAction,
  type SelectionMenuChange,
} from "./useSelectionMenu";

export function ToolbarMoreMenu({
  children,
  bindTooltip,
  onOpenChange,
  childMenuOpen,
}: {
  children: (run: RunToolbarAction) => ReactNode;
  bindTooltip: BindTooltip;
  onOpenChange: SelectionMenuChange;
  childMenuOpen: boolean;
}) {
  const editor = useBlockNoteEditor();
  const menu = useSelectionMenu(editor, "more", onOpenChange);
  return (
    <Popover open={menu.open} onOpenChange={menu.setOpen}>
      <Tooltip {...bindTooltip("more-formatting")}>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="goose-formatting-toolbar-control"
              aria-label="更多格式"
            >
              <MoreHorizontal />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <ToolbarTooltip label="更多格式" />
      </Tooltip>
      <PopoverContent
        editorContext
        side="top"
        align="end"
        className="goose-formatting-toolbar-overflow w-auto p-1"
        onInteractOutside={(event) => {
          if (childMenuOpen) event.preventDefault();
        }}
        onMouseDown={(event) => {
          const target = event.target as HTMLElement;
          if (!target.closest("input,textarea,[contenteditable='true']"))
            event.preventDefault();
        }}
      >
        <div
          data-formatting-toolbar
          className="goose-formatting-toolbar-menu"
          role="toolbar"
          aria-label="更多格式"
        >
          {children(menu.runAction)}
        </div>
      </PopoverContent>
    </Popover>
  );
}
