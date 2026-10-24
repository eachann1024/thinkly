import { cloneElement, useLayoutEffect, useRef, type ReactElement, type MouseEvent } from "react";
import type { BlockNoteEditor } from "@blocknote/core";
import { ArrowUp, ArrowDown, Copy, Scissors, Clipboard, Trash2, Replace, ChevronRight } from "@/components/ui/icons";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { EditorSubmenuTrigger } from "../ui/vendor-menu";
import { useEditorContextClipboard } from "../menus/useEditorContextClipboard";
import { useEditorSettings } from "../platform/hostContext";
import { blockHandleCapabilities, BlockHandleIcon } from "./blockHandleModel";
import { blockHandleText as t } from "./blockHandleMessages";
import { BLOCK_CONVERSIONS } from "./blocknoteCommandSlashItems";
import { convertHandleBlock, deleteHandleBlock, insertFromHandle, selectHandleBlock } from "./blockHandleActions";
import { toggleHeadingCollapsed } from "./headingSectionFold";
import { BlockHandleStyleMenus } from "./BlockHandleStyleMenus";
import { useBlockHandleMenuLayout } from "./useBlockHandleMenuLayout";
import { setBlockHandleMenuOpen } from "../state/blockHandleMenu";
import { getBlockToolbarOwner } from "./blockToolbarOwner";

type Props = {
  editor: BlockNoteEditor<any, any, any>;
  block: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  headingFold?: { expanded: boolean; onToggle: () => void };
  anchor: DOMRect;
  children: ReactElement<{ onClick?: (event: MouseEvent) => void; "aria-expanded"?: boolean; "aria-haspopup"?: "menu" }>;
};

export function BlockHandleMenu({ editor, block, open, onOpenChange, headingFold, anchor, children }: Props) {
  const selectedText = useRef("");
  const menuOwner = useRef({}).current;
  useLayoutEffect(() => {
    setBlockHandleMenuOpen(editor, menuOwner, open);
    return () => setBlockHandleMenuOpen(editor, menuOwner, false);
  }, [editor, menuOwner, open]);
  const { defaultCodeBlockWrap } = useEditorSettings();
  const clipboard = useEditorContextClipboard(editor, editor.isEditable, selectedText);
  const capabilities = blockHandleCapabilities(editor, block);
  const owner = getBlockToolbarOwner(editor.prosemirrorView.dom);
  const run = (action: () => void) => {
    action();
    changeOpen(false);
  };
  const layout = useBlockHandleMenuLayout(editor.prosemirrorView.dom, open, anchor);
  const changeOpen = (next: boolean) => {
    setBlockHandleMenuOpen(editor, menuOwner, next);
    if (next && selectHandleBlock(editor, block.id)) clipboard.rememberContextSelection();
    onOpenChange(next);
  };
  return (
    <DropdownMenu open={open} onOpenChange={changeOpen}>
      <div className="goose-block-menu-anchor">
        <DropdownMenuTrigger asChild><span ref={layout.triggerRef} aria-hidden="true" tabIndex={-1} className="goose-block-menu-positioner" /></DropdownMenuTrigger>
        {cloneElement(children, {
          "aria-expanded": open,
          "aria-haspopup": "menu",
          onClick: (event) => { children.props.onClick?.(event); if (!event.defaultPrevented) changeOpen(!open); },
        })}
      </div>
      <DropdownMenuContent ref={layout.menuRef} variant="menu" side={layout.side} shouldFlip={layout.side === "bottom"}
        boundaryElement={layout.boundaryElement} sideOffset={layout.sideOffset} style={layout.rootStyle} align="start" collisionPadding={8}
        data-goose-block-handle-menu={block.id} data-goose-block-id={block.id} data-goose-editor-owner={owner}
        className="goose-block-handle-menu" motion="instant">
        {capabilities.insertBefore && <DropdownMenuItem onSelect={() => run(() => { insertFromHandle(editor, block.id, "before"); })}>
          <ArrowUp />{t("before")}
        </DropdownMenuItem>}
        {capabilities.insertAfter && <DropdownMenuItem onSelect={() => run(() => { insertFromHandle(editor, block.id, "after"); })}>
          <ArrowDown />{t("after")}
        </DropdownMenuItem>}
        {capabilities.convert && <EditorSubmenuTrigger>
          <DropdownMenuItem textValue={t("convert")}><Replace />{t("convert")}<ChevronRight className="ml-auto" /></DropdownMenuItem>
          <DropdownMenuContent variant="menu" side={layout.submenuSide} shouldFlip={layout.submenuSide === "bottom"}
            boundaryElement={layout.boundaryElement} style={layout.submenuStyle} sideOffset={2} collisionPadding={8}
            data-goose-block-handle-menu={block.id} data-goose-block-id={block.id} data-goose-editor-owner={owner}
            className="goose-block-handle-menu" motion="instant">
            {BLOCK_CONVERSIONS.map((target, index) => <DropdownMenuItem key={index} textValue={target.label}
              onSelect={() => run(() => { convertHandleBlock(editor, block.id, target, defaultCodeBlockWrap); })}>
              <BlockHandleIcon block={{ type: target.type, props: "props" in target ? target.props : {} }} />{target.label}
            </DropdownMenuItem>)}
          </DropdownMenuContent>
        </EditorSubmenuTrigger>}
        <BlockHandleStyleMenus editor={editor} block={block} run={run} layout={layout} />
        {headingFold && <DropdownMenuItem onSelect={() => run(() => {
          toggleHeadingCollapsed(editor, block.id);
          headingFold.onToggle();
        })}><ChevronRight className={headingFold.expanded ? "rotate-90" : undefined} />{headingFold.expanded ? t("collapse") : t("expand")}</DropdownMenuItem>}
        {capabilities.copy && <DropdownMenuItem onSelect={() => run(clipboard.handleCopySelection)}><Copy />{t("copy")}</DropdownMenuItem>}
        {capabilities.mutate && <DropdownMenuItem onSelect={() => run(clipboard.handleCutSelection)}><Scissors />{t("cut")}</DropdownMenuItem>}
        {capabilities.mutate && <DropdownMenuItem onSelect={() => run(clipboard.handleContextPaste)}><Clipboard />{t("paste")}</DropdownMenuItem>}
        {capabilities.mutate && <DropdownMenuItem className="goose-block-handle-danger" onSelect={() => run(() => { deleteHandleBlock(editor, block.id); })}>
          <Trash2 />{t("remove")}
        </DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
