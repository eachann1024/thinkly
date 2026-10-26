import { cloneElement, useCallback, useLayoutEffect, useRef, type ReactElement, type MouseEvent, type PointerEvent } from "react";
import type { BlockNoteEditor } from "@blocknote/core";
import { ArrowUp, ArrowDown, Trash2, Replace, ChevronRight } from "@/components/ui/icons";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { EditorSubmenuTrigger } from "../ui/vendor-menu";
import { useEditorSettings } from "../platform/hostContext";
import { blockHandleCapabilities, BlockHandleIcon } from "./blockHandleModel";
import { blockHandleText as t } from "./blockHandleMessages";
import { BLOCK_CONVERSIONS } from "./blocknoteCommandSlashItems";
import { convertHandleBlock, deleteHandleBlock, insertFromHandle, selectHandleBlock } from "./blockHandleActions";
import { BlockHandleStyleMenus } from "./BlockHandleStyleMenus";
import { useBlockHandleMenuLayout } from "./useBlockHandleMenuLayout";
import { setBlockHandleMenuOpen } from "../state/blockHandleMenu";
import { getBlockToolbarOwner } from "./blockToolbarOwner";
import { getHandleConversionBlockIds, syncHandleTextSelection } from "./blockConversionSelection";

type Props = {
  editor: BlockNoteEditor<any, any, any>;
  block: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseComplete: (blockId: string) => void;
  anchor: DOMRect;
  children: ReactElement<{ onClick?: (event: MouseEvent) => void; onPointerDown?: (event: PointerEvent) => void; "aria-expanded"?: boolean; "aria-haspopup"?: "menu" }>;
};

export function BlockHandleMenu({ editor, block, open, onOpenChange, onCloseComplete, anchor, children }: Props) {
  const selectedBlockIds = useRef<string[]>([]);
  useLayoutEffect(() => {
    if (open) selectedBlockIds.current = getHandleConversionBlockIds(editor, block.id);
  }, [editor, block.id, open]);
  const menuFocusRequested = useRef(false);
  const menuOwner = useRef({}).current;
  useLayoutEffect(() => {
    setBlockHandleMenuOpen(editor, menuOwner, open);
    return () => setBlockHandleMenuOpen(editor, menuOwner, false);
  }, [editor, menuOwner, open]);
  const { defaultCodeBlockWrap } = useEditorSettings();
  const capabilities = blockHandleCapabilities(editor, block);
  const owner = getBlockToolbarOwner(editor.prosemirrorView.dom);
  const run = (action: () => void) => {
    action();
    changeOpen(false);
  };
  const layout = useBlockHandleMenuLayout(editor.prosemirrorView.dom, open, anchor);
  const presence = useRef({ open, blockId: block.id, onCloseComplete });
  presence.current = { open, blockId: block.id, onCloseComplete };
  const contentRef = layout.menuRef;
  const setContentRef = useCallback((node: HTMLElement | null) => {
    contentRef.current = node;
    if (!node && !presence.current.open) presence.current.onCloseComplete(presence.current.blockId);
  }, [contentRef]);
  useLayoutEffect(() => {
    if (!open && !contentRef.current) onCloseComplete(block.id);
  }, [open, block.id, contentRef, onCloseComplete]);
  const focusMenu = () => {
    const menu = layout.menuRef.current;
    const item = menu?.querySelector<HTMLElement>('[role="menuitem"][data-focused]:not([aria-disabled="true"])') ??
      menu?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])');
    if (!item) return;
    menuFocusRequested.current = false;
    item.focus({ preventScroll: true });
  };
  useLayoutEffect(() => {
    if (open && menuFocusRequested.current) focusMenu();
    if (!open) menuFocusRequested.current = false;
  }, [open, block.id]);
  const changeOpen = (next: boolean) => {
    setBlockHandleMenuOpen(editor, menuOwner, next);
    onOpenChange(next);
  };
  return (
    <DropdownMenu open={open} onOpenChange={changeOpen}>
      <div className="goose-block-menu-anchor">
        <DropdownMenuTrigger asChild><span ref={layout.triggerRef} aria-hidden="true" tabIndex={-1} className="goose-block-menu-positioner" /></DropdownMenuTrigger>
        {cloneElement(children, {
          "aria-expanded": open,
          "aria-haspopup": "menu",
          onPointerDown: (event) => {
            syncHandleTextSelection(editor);
            children.props.onPointerDown?.(event);
          },
          onClick: (event) => {
            children.props.onClick?.(event);
            selectedBlockIds.current = getHandleConversionBlockIds(editor, block.id);
            selectHandleBlock(editor, block.id);
            if (!event.defaultPrevented) changeOpen(!open);
            if (event.defaultPrevented || !open) {
              menuFocusRequested.current = true;
              focusMenu();
            }
          },
        })}
      </div>
      <DropdownMenuContent data-goose-root-menu="" ref={setContentRef} variant="menu" isNonModal side={layout.side} shouldFlip={false}
        portalContainer={layout.portalContainer} boundaryElement={layout.boundaryElement} sideOffset={layout.sideOffset} style={layout.rootStyle} align="start" collisionPadding={8}
        data-goose-block-handle-menu={block.id} data-goose-block-id={block.id} data-goose-editor-owner={owner}
        className="goose-block-handle-menu">
        {capabilities.insertBefore && <DropdownMenuItem onSelect={() => run(() => { insertFromHandle(editor, block.id, "before"); })}>
          <ArrowUp />{t("before")}
        </DropdownMenuItem>}
        {capabilities.insertAfter && <DropdownMenuItem onSelect={() => run(() => { insertFromHandle(editor, block.id, "after"); })}>
          <ArrowDown />{t("after")}
        </DropdownMenuItem>}
        {capabilities.convert && <EditorSubmenuTrigger>
          <DropdownMenuItem textValue={t("convert")}><Replace />{t("convert")}<ChevronRight className="ml-auto" /></DropdownMenuItem>
          <DropdownMenuContent variant="menu" isNonModal data-goose-submenu-direction={layout.submenuSide} side={layout.submenuSide} shouldFlip={layout.submenuSide === "bottom"}
            boundaryElement={layout.boundaryElement} style={layout.submenuStyle} sideOffset={2} collisionPadding={8}
            data-goose-block-handle-menu={block.id} data-goose-block-id={block.id} data-goose-editor-owner={owner}
            className="goose-block-handle-menu">
            {BLOCK_CONVERSIONS.map((target, index) => <DropdownMenuItem key={index} textValue={target.label}
              onSelect={() => run(() => { convertHandleBlock(editor, block.id, target, defaultCodeBlockWrap, selectedBlockIds.current); })}>
              <BlockHandleIcon block={{ type: target.type, props: "props" in target ? target.props : {} }} />{target.label}
            </DropdownMenuItem>)}
          </DropdownMenuContent>
        </EditorSubmenuTrigger>}
        <BlockHandleStyleMenus editor={editor} block={block} run={run} layout={layout} />
        {capabilities.mutate && <DropdownMenuItem className="goose-block-handle-danger" onSelect={() => run(() => { deleteHandleBlock(editor, block.id); })}>
          <Trash2 />{t("remove")}
        </DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
