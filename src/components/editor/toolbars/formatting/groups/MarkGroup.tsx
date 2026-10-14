import * as LucideIcons from "lucide-react";
import { Tooltip, TooltipTrigger } from "@/components/editor/ui/tooltip";
import { Toggle } from "@/components/editor/ui/toggle";
import { useBlockNoteEditor } from "@blocknote/react";
import { ToolbarTooltip, type BindTooltip } from "../ToolbarTooltip";
import { toggleSelectionMark } from "../helpers";

const ITEM_CLASS = "goose-formatting-toolbar-control";

export function MarkGroup({
  isBold,
  isItalic,
  isStrike,
  bindTooltip,
  hideMarks,
}: {
  isBold: boolean;
  isItalic: boolean;
  isStrike: boolean;
  bindTooltip: BindTooltip;
  hideMarks?: boolean;
}) {
  const editor = useBlockNoteEditor();

  if (hideMarks) return null;

  return (
    <>
      <Tooltip {...bindTooltip("bold")}>
        <TooltipTrigger asChild>
          <Toggle
            size="sm"
            pressed={isBold}
            onPressedChange={() => toggleSelectionMark(editor, "bold")}
            aria-label="粗体"
            className={ITEM_CLASS}
          >
            <LucideIcons.Bold className="h-[15px] w-[15px]" />
          </Toggle>
        </TooltipTrigger>
        <ToolbarTooltip label="粗体" shortcut="Mod+B" />
      </Tooltip>

      <Tooltip {...bindTooltip("italic")}>
        <TooltipTrigger asChild>
          <Toggle
            size="sm"
            pressed={isItalic}
            onPressedChange={() => toggleSelectionMark(editor, "italic")}
            aria-label="斜体"
            className={ITEM_CLASS}
          >
            <LucideIcons.Italic className="h-[15px] w-[15px]" />
          </Toggle>
        </TooltipTrigger>
        <ToolbarTooltip label="斜体" shortcut="Mod+I" />
      </Tooltip>

      <Tooltip {...bindTooltip("strike")}>
        <TooltipTrigger asChild>
          <Toggle
            size="sm"
            pressed={isStrike}
            onPressedChange={() => toggleSelectionMark(editor, "strike")}
            aria-label="删除线"
            className={ITEM_CLASS}
          >
            <LucideIcons.Strikethrough className="h-[15px] w-[15px]" />
          </Toggle>
        </TooltipTrigger>
        <ToolbarTooltip label="删除线" shortcut="Mod+Shift+S" />
      </Tooltip>
    </>
  );
}
