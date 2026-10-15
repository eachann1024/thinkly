import * as GooseIcons from "@/components/ui/icons";
import { Tooltip, TooltipTrigger } from "@/components/editor/ui/tooltip";
import { Toggle } from "@/components/editor/ui/toggle";
import { useBlockNoteEditor } from "@blocknote/react";
import { ToolbarTooltip, type BindTooltip } from "../ToolbarTooltip";
import { withPreservedSelection } from "../selectionRestore";
import type { RunToolbarAction } from "../useSelectionMenu";
import type { BooleanMarkState } from "../selectionMarkStates";

const ITEM_CLASS = "goose-formatting-toolbar-control";

export function InlineGroup({
  isUnderline,
  isCode,
  bindTooltip,
  hideMarks,
  items = ["underline", "code"],
  runAction,
}: {
  isUnderline: BooleanMarkState;
  isCode: BooleanMarkState;
  bindTooltip: BindTooltip;
  hideMarks?: boolean;
  items?: readonly ("underline" | "code")[];
  runAction?: RunToolbarAction;
}) {
  const editor = useBlockNoteEditor();

  if (hideMarks) return null;
  const run = runAction ?? ((apply) => withPreservedSelection(editor, apply));

  return (
    <>
      {items.includes("underline") && (
        <Tooltip {...bindTooltip("underline")}>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={isUnderline === true}
              aria-pressed={isUnderline}
              data-format-state={isUnderline === "mixed" ? "mixed" : undefined}
              onPressedChange={() =>
                run(() => isUnderline === true
                  ? editor.removeStyles({ underline: true })
                  : editor.addStyles({ underline: true }))
              }
              aria-label={isUnderline === "mixed" ? "下划线（混合格式）" : "下划线"}
              className={ITEM_CLASS}
            >
              <GooseIcons.Underline className="h-[15px] w-[15px]" />
            </Toggle>
          </TooltipTrigger>
          <ToolbarTooltip label={isUnderline === "mixed" ? "下划线（混合格式）" : "下划线"} shortcut="Mod+U" />
        </Tooltip>
      )}

      {items.includes("code") && (
        <Tooltip {...bindTooltip("code")}>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={isCode === true}
              aria-pressed={isCode}
              data-format-state={isCode === "mixed" ? "mixed" : undefined}
              onPressedChange={() =>
                run(() => isCode === true
                  ? editor.removeStyles({ code: true })
                  : editor.addStyles({ code: true }))
              }
              aria-label={isCode === "mixed" ? "行内代码（混合格式）" : "行内代码"}
              className={ITEM_CLASS}
            >
              <GooseIcons.Code className="h-[15px] w-[15px]" />
            </Toggle>
          </TooltipTrigger>
          <ToolbarTooltip label={isCode === "mixed" ? "行内代码（混合格式）" : "行内代码"} shortcut="Mod+E" />
        </Tooltip>
      )}
    </>
  );
}
