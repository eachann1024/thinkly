import * as LucideIcons from "lucide-react";
import { Tooltip, TooltipTrigger } from "@/components/editor/ui/tooltip";
import { Toggle } from "@/components/editor/ui/toggle";
import { useBlockNoteEditor } from "@blocknote/react";
import { ToolbarTooltip, type BindTooltip } from "../ToolbarTooltip";
import { toggleSelectionMark } from "../helpers";

const ITEM_CLASS = "goose-formatting-toolbar-control";

export function InlineGroup({
  isUnderline,
  isCode,
  bindTooltip,
  hideMarks,
}: {
  isUnderline: boolean;
  isCode: boolean;
  bindTooltip: BindTooltip;
  hideMarks?: boolean;
}) {
  const editor = useBlockNoteEditor();

  if (hideMarks) return null;

  return (
    <>
      <Tooltip {...bindTooltip("underline")}>
        <TooltipTrigger asChild>
          <Toggle
            size="sm"
            pressed={isUnderline}
            onPressedChange={() => toggleSelectionMark(editor, "underline")}
            aria-label="下划线"
            className={ITEM_CLASS}
          >
            <LucideIcons.Underline className="h-[15px] w-[15px]" />
          </Toggle>
        </TooltipTrigger>
        <ToolbarTooltip label="下划线" shortcut="Mod+U" />
      </Tooltip>

      <Tooltip {...bindTooltip("code")}>
        <TooltipTrigger asChild>
          <Toggle
            size="sm"
            pressed={isCode}
            onPressedChange={() => toggleSelectionMark(editor, "code")}
            aria-label="行内代码"
            className={ITEM_CLASS}
          >
            <LucideIcons.Code className="h-[15px] w-[15px]" />
          </Toggle>
        </TooltipTrigger>
        <ToolbarTooltip label="行内代码" shortcut="Mod+E" />
      </Tooltip>
    </>
  );
}
