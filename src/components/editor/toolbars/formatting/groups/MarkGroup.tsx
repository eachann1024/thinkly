import * as GooseIcons from "@/components/ui/icons";
import { Tooltip, TooltipTrigger } from "@/components/editor/ui/tooltip";
import { Toggle } from "@/components/editor/ui/toggle";
import { useBlockNoteEditor } from "@blocknote/react";
import { ToolbarTooltip, type BindTooltip } from "../ToolbarTooltip";
import { withPreservedSelection } from "../selectionRestore";
import type { RunToolbarAction } from "../useSelectionMenu";
import type { BooleanMarkState } from "../selectionMarkStates";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/toolbars/formatting/groups/MarkGroup.tsx#messages:1">`
zh-Hans:
  bold: "粗体"
  italic: "斜体"
  strikethrough: "删除线"
  mixedFormatting: "{{label}}（混合格式）"
en:
  bold: "Bold"
  italic: "Italic"
  strikethrough: "Strikethrough"
  mixedFormatting: "{{label}} (mixed formatting)"
`;
const t = createTranslator(messages);


const ITEM_CLASS = "goose-formatting-toolbar-control";
const MARKS = [
  { key: "bold", get label() { return t("bold"); }, icon: GooseIcons.Bold, shortcut: "Mod+B" },
  { key: "italic", get label() { return t("italic"); }, icon: GooseIcons.Italic, shortcut: "Mod+I" },
  {
    key: "strike",
    get label() { return t("strikethrough"); },
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
  useLocale();
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
                aria-label={active[key] === "mixed" ? t("mixedFormatting", { label }) : label}
              >
                <Icon className="h-[15px] w-[15px]" />
              </Toggle>
            </TooltipTrigger>
            <ToolbarTooltip label={active[key] === "mixed" ? t("mixedFormatting", { label }) : label} shortcut={shortcut} />
          </Tooltip>
        ),
      )}
    </>
  );
}
