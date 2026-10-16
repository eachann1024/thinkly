import { CheckSquare, List, ListOrdered } from "@/components/ui/icons";
import { useBlockNoteEditor, useEditorState } from "@blocknote/react";
import { Tooltip, TooltipTrigger } from "@/components/editor/ui/tooltip";
import { Toggle } from "@/components/editor/ui/toggle";
import { ToolbarTooltip, type BindTooltip } from "../ToolbarTooltip";
import { withPreservedSelection } from "../selectionRestore";
import type { RunToolbarAction } from "../useSelectionMenu";
import {
  applySelectedListType,
  getListTypeToolbarState,
  type ListBlockType,
} from "../listType";

const ITEM_CLASS = "goose-formatting-toolbar-control";

const LIST_TYPE_ITEMS: {
  type: ListBlockType;
  label: string;
  shortcut: string;
  icon: typeof List;
}[] = [
  { type: "checkListItem", label: "提醒事项", shortcut: "Mod+Shift+9", icon: CheckSquare },
  { type: "bulletListItem", label: "无序列表", shortcut: "Mod+Shift+8", icon: List },
  { type: "numberedListItem", label: "有序列表", shortcut: "Mod+Shift+7", icon: ListOrdered },
];

export function ListTypeGroup({
  bindTooltip,
  runAction,
}: {
  bindTooltip: BindTooltip;
  runAction?: RunToolbarAction;
}) {
  const editor = useBlockNoteEditor();
  const run = runAction ?? ((apply) => withPreservedSelection(editor, apply));
  const active = useEditorState({
    editor,
    selector: ({ editor }) => getListTypeToolbarState(editor).active,
  });

  return (
    <>
      {LIST_TYPE_ITEMS.map(({ type, label, shortcut, icon: Icon }) => (
        <Tooltip key={type} {...bindTooltip(`list-${type}`)}>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={active === type}
              onPressedChange={() =>
                run(() => {
                  applySelectedListType(editor, type);
                })
              }
              aria-label={label}
              className={ITEM_CLASS}
            >
              <Icon className="h-[15px] w-[15px]" />
            </Toggle>
          </TooltipTrigger>
          <ToolbarTooltip label={label} shortcut={shortcut} />
        </Tooltip>
      ))}
    </>
  );
}
