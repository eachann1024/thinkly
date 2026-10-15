import type { BlockNoteEditor } from "@blocknote/core";
import { getProtectedTitleBlockId } from "../utils/documentTitlePolicy";
import { moveSelectedBlocksByShortcut } from "../extensions/moveBlockExtension";
import { duplicateSelectedBlocks } from "../extensions/duplicateBlocks";
import { captureBlockMenuTarget, resolveBlockMenuTarget, restoreBlockMenuTarget, type BlockMenuTarget } from "./blockMenuTarget";

export type MenuEditor = BlockNoteEditor<any, any, any>;
export type BlockMenuRequest = { blockId: string; x?: number; y?: number };

export function requestBlockMenu(editor: MenuEditor, blockId: string, x?: number, y?: number) {
  editor.prosemirrorView.dom.dispatchEvent(new CustomEvent<BlockMenuRequest>("goose-open-block-menu", {
    bubbles: true, detail: { blockId, x, y },
  }));
}

export function selectMenuBlock(editor: MenuEditor, id: string): BlockMenuTarget | null {
  const target = captureBlockMenuTarget(editor, id);
  return target && restoreBlockMenuTarget(editor, target) ? target : null;
}

export function menuBlocks(editor: MenuEditor, target: BlockMenuTarget) {
  return resolveBlockMenuTarget(editor, target);
}

export function duplicateMenuBlocks(editor: MenuEditor, target: BlockMenuTarget) {
  if (restoreBlockMenuTarget(editor, target)) duplicateSelectedBlocks(editor);
}

export function deleteMenuBlocks(editor: MenuEditor, target: BlockMenuTarget) {
  const title = getProtectedTitleBlockId(editor);
  const blocks = menuBlocks(editor, target).filter((block) => block.id !== title);
  if (blocks.length) editor.removeBlocks(blocks as any);
}

export function moveMenuBlocks(editor: MenuEditor, direction: "up" | "down", target: BlockMenuTarget) {
  if (restoreBlockMenuTarget(editor, target)) moveSelectedBlocksByShortcut(editor, direction);
}

export const BLOCK_CONVERSIONS = [
  { label: "文本", type: "paragraph" },
  { label: "一级标题", type: "heading", props: { level: 1, isToggleable: false, collapsed: false } },
  { label: "二级标题", type: "heading", props: { level: 2, isToggleable: false, collapsed: false } },
  { label: "三级标题", type: "heading", props: { level: 3, isToggleable: false, collapsed: false } },
  { label: "待办事项", type: "checkListItem" },
  { label: "无序列表", type: "bulletListItem" },
  { label: "有序列表", type: "numberedListItem" },
  { label: "折叠列表", type: "toggleListItem", props: { collapsed: false } },
  { label: "折叠一级标题", type: "heading", props: { level: 1, isToggleable: true, collapsed: false } },
  { label: "折叠二级标题", type: "heading", props: { level: 2, isToggleable: true, collapsed: false } },
  { label: "折叠三级标题", type: "heading", props: { level: 3, isToggleable: true, collapsed: false } },
  { label: "引用", type: "quote" },
  { label: "标注", type: "callout" },
  { label: "代码块", type: "codeBlock", props: { language: "text" } },
] as const;
