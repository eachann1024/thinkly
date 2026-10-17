import { useBlockNoteEditor } from "@blocknote/react";
import { AlignLeft, AlignCenter, AlignRight } from "@/components/ui/icons";
import { Button } from "@/components/editor/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/editor/ui/popover";
import { Tooltip, TooltipTrigger } from "@/components/editor/ui/tooltip";
import { ToolbarTooltip, type BindTooltip } from "../ToolbarTooltip";
import {
  useSelectionMenu,
  type SelectionMenuChange,
} from "../useSelectionMenu";
import { AlignGroup } from "./AlignGroup";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/components/editor/toolbars/formatting/groups/AlignmentMenu.tsx#messages:1">`
zh-Hans:
  alignment: "对齐方式"
en:
  alignment: "Alignment"
`;
const t = createTranslator(messages);


export function AlignmentMenu({
  textAlignment,
  setTextAlignment,
  bindTooltip,
  onOpenChange,
}: {
  textAlignment: string;
  setTextAlignment: (alignment: "left" | "center" | "right") => void;
  bindTooltip: BindTooltip;
  onOpenChange: SelectionMenuChange;
}) {
  const editor = useBlockNoteEditor();
  const menu = useSelectionMenu(editor, "alignment", onOpenChange);
  const Icon =
    textAlignment === "center"
      ? AlignCenter
      : textAlignment === "right"
        ? AlignRight
        : AlignLeft;
  return (
    <Popover open={menu.open} onOpenChange={menu.setOpen}>
      <Tooltip {...bindTooltip("alignment")}>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="goose-formatting-toolbar-control"
              aria-label={t("alignment")}
            >
              <Icon />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <ToolbarTooltip label={t("alignment")} />
      </Tooltip>
      <PopoverContent
        editorContext
        side="top"
        className="w-auto p-1"
        onMouseDown={(event) => event.preventDefault()}
      >
        <div
          data-formatting-toolbar
          className="goose-formatting-toolbar-menu"
          role="toolbar"
          aria-label={t("alignment")}
        >
          <AlignGroup
            textAlignment={textAlignment}
            bindTooltip={bindTooltip}
            setTextAlignment={(alignment) => {
              menu.runAction(() => setTextAlignment(alignment));
              menu.setOpen(false);
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
