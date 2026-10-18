import { blockToEditorNode } from "@/components/editor/core/fastBlockToNode";
import type { BlockNoteEditor } from "@blocknote/core";
import { Fragment, Slice } from "@tiptap/pm/model";
import { TextSelection, Selection, type EditorState } from "@tiptap/pm/state";
import { normalizeBlockNoteClipboardHtml } from "../extensions/copyBlockClipboard";
import { isValidUrl, looksLikeMarkdownFragment } from "./clipboard";
import { importMarkdownFragment } from "@/lib/export/markdown/parse";
import { restoreBlockPropsMarkers } from "@/lib/export/markdown/blockPropsMarker";
import { htmlLooksLikeBlockNoteClipboard } from "./multilinePaste";
import { toast } from "@/components/ui/sonner";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/components/editor/utils/containedPaste.ts#messages:1">`
zh-Hans:
  theClipboardContentCouldNotBeRead: "剪贴板内容无法解析"
  pasteFailedYourOriginalContentHasBeenPreserved: "粘贴失败，原内容已保留"
en:
  theClipboardContentCouldNotBeRead: "The clipboard content could not be read"
  pasteFailedYourOriginalContentHasBeenPreserved: "Paste failed. Your original content has been preserved."
ja:
  theClipboardContentCouldNotBeRead: "クリップボードの内容を解析できません"
  pasteFailedYourOriginalContentHasBeenPreserved: "貼り付けに失敗しました。元の内容は残されています"
`;
const t = createTranslator(messages);


type Editor = BlockNoteEditor<any, any, any>;
const CONTAINERS = new Set(["callout", "quote"]);

/** Only a text selection within one inline block can imply continuing that block. */
export function containedPasteTarget(state: Pick<EditorState, "selection">) {
  const { selection } = state;
  if (!(selection instanceof TextSelection)) return null;
  const { $from, $to } = selection;
  if (!$from.sameParent($to) || !$from.parent.isTextblock || $from.parent.type.spec.code) return null;
  for (let d = $from.depth; d > 0; d--) {
    if (["table", "tableCell", "tableHeader"].includes($from.node(d).type.name)) return null;
  }
  const depth = $from.depth - 1;
  const block = $from.node(depth);
  if (block.type.name !== "blockContainer") return null;
  // First H1 keeps the existing title isolation policy.
  if ($from.before(depth) === 1 && $from.parent.type.name === "heading" && $from.parent.attrs.level === 1) return null;
  let continuation = false;
  $from.parent.forEach((node, offset) => {
    if (offset < $from.parentOffset && node.type.name === "hardBreak") continuation = true;
  });
  const background = $from.parent.attrs.backgroundColor;
  if (!CONTAINERS.has($from.parent.type.name) && !continuation && (!background || background === "default")) return null;
  return { depth, block, pos: $from.before(depth) };
}

function freshBlocks(blocks: any[]): any[] {
  return blocks.map(({ id: _id, children, ...block }) => ({
    ...block,
    ...(children ? { children: freshBlocks(children) } : {}),
  }));
}

/** Insert real child blocks at the caret, retaining the suffix and existing children. */
export function insertContainedBlocks(editor: Editor, blocks: any[]): string[] | null {
  // 媒体占位块会在外层 transact 中调用；必须复用当前事务，不能读取
  // prosemirrorState 或自行 dispatch，否则 BlockNote 会在上传前抛错。
  return editor.transact((tr) => {
    const target = containedPasteTarget(tr);
    if (!target || !blocks.length) return null;
    const schema = tr.doc.type.schema;
    const nodes = freshBlocks(blocks).map((block) => blockToEditorNode(block, schema));
    const { $from, $to } = tr.selection;
    const suffix = $to.parent.content.cut($to.parentOffset);
    const children = [...nodes];
    if (suffix.size) {
      const tail = blockToEditorNode({ type: "paragraph" }, schema);
      children.push(tail.copy(Fragment.from(tail.firstChild!.copy(suffix))));
    }
    const prefix = $from.parent.content.cut(0, $from.parentOffset);
    const content = $from.parent.copy(prefix);
    const oldChildren = target.block.childCount > 1 ? target.block.child(1).content : Fragment.empty;
    const group = schema.nodes.blockGroup.create(null, Fragment.fromArray(children).append(oldChildren));
    const replacement = target.block.copy(Fragment.fromArray([content, group]));
    tr.replaceWith(target.pos, target.pos + target.block.nodeSize, replacement);
    const end = target.pos + 1 + content.nodeSize + 1 + nodes.reduce((sum, node) => sum + node.nodeSize, 0);
    tr.setSelection(Selection.near(tr.doc.resolve(end - 1), -1));
    tr.scrollIntoView();
    return nodes.map((node) => String(node.attrs.id));
  });
}

/** Shared by native keyboard paste and the context menu; parsing is synchronous. */
export function pasteInsideCurrentBlock(
  editor: Editor,
  plain: string,
  html: string,
  nativeHtml = "",
  plainOnly = false,
): boolean {
  if (!containedPasteTarget(editor.prosemirrorState) || (!plain && !html && !nativeHtml)) return false;
  // Preserve the existing URL-over-selection link behavior.
  if (!plainOnly && !/\s/.test(plain.trim()) && isValidUrl(plain.trim())) return false;
  try {
    const internal = normalizeBlockNoteClipboardHtml(nativeHtml || (htmlLooksLikeBlockNoteClipboard(html) ? html : ""));
    let blocks: any[];
    if (plainOnly) {
      blocks = [{ type: "paragraph", content: plain }];
    } else if (internal || html) {
      blocks = editor.tryParseHTMLToBlocks(internal || html);
    } else if (looksLikeMarkdownFragment(plain)) {
      const parsed = importMarkdownFragment(plain);
      blocks = parsed ? restoreBlockPropsMarkers(parsed) : editor.tryParseMarkdownToBlocks(plain);
    } else {
      blocks = [{ type: "paragraph", content: plain }];
    }
    if (!blocks.length) throw new Error(t("theClipboardContentCouldNotBeRead"));
    // Paragraph-only content is text within the current block. Structured content
    // keeps its types and children instead of being flattened into plain text.
    const openSlice = internal.match(/data-pm-slice=["'](\d+)\s+(\d+)/);
    const partialInline = blocks.length === 1 && !blocks[0].children?.length &&
      Array.isArray(blocks[0].content) && openSlice && Number(openSlice[1]) >= 2 && Number(openSlice[2]) >= 2;
    const inlineOnly = partialInline || (!internal && blocks.every((block) =>
      block.type === "paragraph" && !block.children?.length &&
      Object.entries(block.props ?? {}).every(([key, value]) =>
        value == null || value === "default" || (key === "textAlignment" && value === "left")),
    ));
    if (inlineOnly) {
      const state = editor.prosemirrorState;
      let content = Fragment.empty;
      freshBlocks(blocks).forEach((block, index) => {
        if (index) content = content.append(Fragment.from(state.schema.nodes.hardBreak.create()));
        content = content.append(blockToEditorNode(block, state.schema).firstChild!.content);
      });
      editor.prosemirrorView.dispatch(state.tr.replaceSelection(new Slice(content, 0, 0)).scrollIntoView());
    } else {
      insertContainedBlocks(editor, blocks);
    }
    editor.focus();
  } catch (error) {
    console.error("[containedPaste]", error);
    toast.error(t("pasteFailedYourOriginalContentHasBeenPreserved"));
  }
  return true;
}
