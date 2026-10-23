import type { BlockNoteEditor } from "@blocknote/core";
import { SuggestionMenu } from "@blocknote/core/extensions";
import { getProtectedTitleBlockId } from "../utils/documentTitlePolicy";
import { isInteractiveEditorTarget } from "../utils/selection";
import { HEADING_SIDE_MENU_EXTRA_GAP, SIDE_MENU_CONTENT_GAP } from "./sideMenuHover";

type AnyEditor = BlockNoteEditor<any, any, any>;

export type TrailingAddAnchor = { top: number; left: number };

/** 指针可从正文左侧这么远处开始算作末尾空白，盖住加号所在的槽位。 */
const GUTTER_REACH = 72;

function isEmptyParagraph(block: any): boolean {
  return (
    block?.type === "paragraph" &&
    Array.isArray(block.content) &&
    block.content.length === 0 &&
    !(block.children?.length > 0)
  );
}

/** 文末可复用的空段落；标题块不复用。 */
function reusableLastBlock(editor: AnyEditor) {
  const last = editor.document.at(-1);
  if (!last || last.id === getProtectedTitleBlockId(editor)) return undefined;
  return isEmptyParagraph(last) ? last : undefined;
}

function lastVisibleTopBlock(dom: HTMLElement): HTMLElement | null {
  const group = dom.querySelector<HTMLElement>(":scope > .bn-block-group");
  const outers = group?.querySelectorAll<HTMLElement>(":scope > .bn-block-outer");
  if (!outers) return null;
  for (let index = outers.length - 1; index >= 0; index -= 1) {
    if (outers[index].getClientRects().length > 0) return outers[index];
  }
  return null;
}

function lineHeightOf(element: HTMLElement): number {
  const style = getComputedStyle(element);
  const value = Number.parseFloat(style.lineHeight);
  return Number.isFinite(value) ? value : (Number.parseFloat(style.fontSize) || 16) * 1.5;
}

/** 指针在最后一个可见块下方的空白里时，返回加号要画的位置。 */
export function readTrailingAddAnchor(
  editor: AnyEditor,
  clientX: number,
  clientY: number,
  target: Element | null,
): TrailingAddAnchor | null {
  const view = editor.prosemirrorView;
  if (!view || view.isDestroyed || !editor.isEditable) return null;
  const dom = view.dom as HTMLElement;
  const scroller = dom.closest<HTMLElement>(".page-scroll-container") ?? dom.parentElement;
  if (!scroller || !target || !scroller.contains(target)) return null;
  if (target instanceof HTMLElement && isInteractiveEditorTarget(target)) return null;
  if (target.closest(".bn-block-outer")) return null;
  if (editor.getExtension(SuggestionMenu)?.shown()) return null;

  const last = lastVisibleTopBlock(dom);
  if (!last) return null;
  const lastRect = last.getBoundingClientRect();
  const domRect = dom.getBoundingClientRect();
  const scrollRect = scroller.getBoundingClientRect();
  if (clientY < lastRect.bottom || clientY > scrollRect.bottom) return null;
  const left =
    (dom.querySelector(":scope > .bn-block-group") ?? dom).getBoundingClientRect().left;
  if (clientX < left - GUTTER_REACH || clientX > domRect.right) return null;

  const lastIsReusable = reusableLastBlock(editor)?.id === last.dataset.id;
  const content = last.querySelector<HTMLElement>(".bn-block-content") ?? last;
  const top = lastIsReusable
    ? content.getBoundingClientRect().top + content.getBoundingClientRect().height / 2
    : lastRect.bottom + lineHeightOf(dom) / 2;
  if (top > scrollRect.bottom) return null;
  return { top, left: left - SIDE_MENU_CONTENT_GAP - HEADING_SIDE_MENU_EXTRA_GAP };
}

/** 在文末放好空段落并打开块菜单；返回本次新建的块 id（复用已有空段落时为 undefined）。 */
export function openTrailingBlockMenu(editor: AnyEditor): string | undefined {
  const suggestionMenu = editor.getExtension(SuggestionMenu);
  const last = editor.document.at(-1);
  if (!suggestionMenu || !last || suggestionMenu.shown()) return undefined;
  editor.focus();
  const reusable = reusableLastBlock(editor);
  let createdId: string | undefined;
  editor.transact((tr) => {
    // 只为打开菜单而补的空行不进撤销栈，没选就删掉时也不留痕迹。
    tr.setMeta("addToHistory", false);
    const target = reusable ?? editor.insertBlocks([{ type: "paragraph" }], last, "after")[0];
    if (!reusable) createdId = target?.id;
    if (target) editor.setTextCursorPosition(target, "start");
  });
  suggestionMenu.openSuggestionMenu("/");
  return createdId;
}

/** 菜单关闭后，新建的空行若仍为空且光标已离开，就撤掉。 */
export function discardUntouchedTrailingBlock(editor: AnyEditor, blockId: string): void {
  const view = editor.prosemirrorView;
  if (!view || view.isDestroyed) return;
  const block = editor.getBlock(blockId);
  if (!block || !isEmptyParagraph(block)) return;
  if (view.hasFocus()) {
    try {
      if (editor.getTextCursorPosition().block.id === blockId) return;
    } catch {
      return;
    }
  }
  editor.transact((tr) => {
    tr.setMeta("addToHistory", false);
    editor.removeBlocks([blockId]);
  });
}
