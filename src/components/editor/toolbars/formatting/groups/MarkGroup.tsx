import * as GooseIcons from "@/components/ui/icons";
import { Tooltip, TooltipTrigger } from "@/components/editor/ui/tooltip";
import { Toggle } from "@/components/editor/ui/toggle";
import { useBlockNoteEditor } from "@blocknote/react";
import { ToolbarTooltip, type BindTooltip } from "../ToolbarTooltip";
import { withPreservedSelection } from "../selectionRestore";
import type { RunToolbarAction } from "../useSelectionMenu";
import type { BooleanMarkState } from "../selectionMarkStates";

const ITEM_CLASS = "goose-formatting-toolbar-control";
const MARKS = [
  { key: "bold", label: "粗体", icon: GooseIcons.Bold, shortcut: "Mod+B" },
  { key: "italic", label: "斜体", icon: GooseIcons.Italic, shortcut: "Mod+I" },
  {
    key: "strike",
    label: "删除线",
    icon: GooseIcons.Strikethrough,
    shortcut: "Mod+Shift+S",
  },
] as const;

export function MarkGroup({
  isBold,
  isItalic,
  isStrike,
  bindTooltip,
  hideMarks,
  items = ["bold", "italic", "strike"],
  runAction,
}: {
  isBold: BooleanMarkState;
  isItalic: BooleanMarkState;
  isStrike: BooleanMarkState;
  bindTooltip: BindTooltip;
  hideMarks?: boolean;
  items?: readonly ("bold" | "italic" | "strike")[];
  runAction?: RunToolbarAction;
}) {
  const editor = useBlockNoteEditor();

  if (hideMarks) return null;

  const active = { bold: isBold, italic: isItalic, strike: isStrike };
  const run = runAction ?? ((apply) => withPreservedSelection(editor, apply));

  return (
    <>
      {MARKS.filter(({ key }) => items.includes(key)).map(
        ({ key, label, icon: Icon, shortcut }) => (
          <Tooltip key={key} {...bindTooltip(key)}>
            <TooltipTrigger asChild>
              <Toggle
                size="sm"
                pressed={active[key] === true}
                aria-pressed={active[key]}
                data-format-state={active[key] === "mixed" ? "mixed" : undefined}
                className={ITEM_CLASS}
                onPressedChange={() =>
                  run(() => active[key] === true
                    ? editor.removeStyles({ [key]: true })
                    : editor.addStyles({ [key]: true }))
                }
                aria-label={active[key] === "mixed" ? `${label}（混合格式）` : label}
              >
                <Icon className="h-[15px] w-[15px]" />
              </Toggle>
            </TooltipTrigger>
            <ToolbarTooltip label={active[key] === "mixed" ? `${label}（混合格式）` : label} shortcut={shortcut} />
          </Tooltip>
        ),
      )}
    </>
  );
}
