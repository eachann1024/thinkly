import type { BlockNoteEditor } from "@blocknote/core";
import { AlignLeft, AlignCenter, AlignRight, Palette, ChevronRight, Check } from "@/components/ui/icons";
import { DropdownMenuContent, DropdownMenuItem } from "../ui/dropdown-menu";
import { EditorSubmenuTrigger } from "../ui/vendor-menu";
import { blockHandleCapabilities } from "./blockHandleModel";
import { setHandleBlockProperty } from "./blockHandleActions";
import { blockHandleText as t } from "./blockHandleMessages";
import { getBlockToolbarOwner } from "./blockToolbarOwner";
import { BlockHandleColorPalette } from "./BlockHandleColorPalette";
import type { useBlockHandleMenuLayout } from "./useBlockHandleMenuLayout";

type Props = { editor: BlockNoteEditor<any, any, any>; block: any; run: (action: () => void) => void;
  layout: ReturnType<typeof useBlockHandleMenuLayout> };
const alignment = ["left", "center", "right"] as const;
const alignmentIcons = { left: AlignLeft, center: AlignCenter, right: AlignRight };

export function BlockHandleStyleMenus({ editor, block, run, layout }: Props) {
  const caps = blockHandleCapabilities(editor, block);
  const owner = getBlockToolbarOwner(editor.prosemirrorView.dom);
  return <>
    {caps.color && <EditorSubmenuTrigger>
      <DropdownMenuItem textValue={t("color")}><Palette />{t("color")}<ChevronRight className="ml-auto" /></DropdownMenuItem>
      <DropdownMenuContent variant="menu" side={layout.submenuSide} shouldFlip={layout.submenuSide === "bottom"}
        boundaryElement={layout.boundaryElement} style={layout.submenuStyle} collisionPadding={8} motion="instant"
        data-goose-block-handle-menu={block.id} data-goose-block-id={block.id} data-goose-editor-owner={owner}
        className="goose-block-handle-menu goose-block-color-menu">
        <BlockHandleColorPalette key={block.id} editor={editor} block={block} />
      </DropdownMenuContent>
    </EditorSubmenuTrigger>}
    {caps.align && <EditorSubmenuTrigger>
      <DropdownMenuItem textValue={t("align")}><AlignLeft />{t("align")}<ChevronRight className="ml-auto" /></DropdownMenuItem>
      <DropdownMenuContent variant="menu" side={layout.submenuSide} shouldFlip={layout.submenuSide === "bottom"}
        boundaryElement={layout.boundaryElement} style={layout.submenuStyle} collisionPadding={8} motion="instant"
        data-goose-block-handle-menu={block.id} data-goose-block-id={block.id} data-goose-editor-owner={owner}
        className="goose-block-handle-menu">
        {alignment.map((value) => {
          const Icon = alignmentIcons[value];
          return <DropdownMenuItem key={value} textValue={t(value)} onSelect={() => run(() => { setHandleBlockProperty(editor, block.id, "textAlignment", value); })}>
            <Icon />{t(value)}{block.props.textAlignment === value && <Check className="ml-auto" />}
          </DropdownMenuItem>;
        })}
      </DropdownMenuContent>
    </EditorSubmenuTrigger>}
  </>;
}
