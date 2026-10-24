import { contentNodeToInlineContent, getBlockInfoFromTransaction, nodeToBlock, type BlockNoteEditor } from "@blocknote/core";
import { updateCurrentSlashBlock } from "./slashBlockMutation";

export function createSlashBlockInsertion(
  editor: BlockNoteEditor<any, any, any>,
  defaultCodeBlockWrap = false,
) {
  const focusAndScrollTo = (block: { id: string }, positioned = false) => {
    if (!positioned) {
      try {
        editor.setTextCursorPosition(block, "end");
      } catch {
      }
    }
    editor.focus();
    const state = editor.prosemirrorState;
    window.setTimeout(() => {
      // Do not move a cursor that the user has already moved or typed with.
      if (editor.prosemirrorState.doc !== state.doc || !editor.prosemirrorState.selection.eq(state.selection)) return;
      if (!positioned) {
        try {
          editor.setTextCursorPosition(block, "end");
        } catch {
        }
      }
      editor.focus();
    }, 0);
    requestAnimationFrame(() => {
      const el = document.querySelector(
        `[data-id="${block.id}"]`,
      ) as HTMLElement | null;
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  };

  return (block: any): any => {
    if (block.type === "codeBlock" && block.props?.wrap == null) {
      block = { ...block, props: { ...block.props, wrap: defaultCodeBlockWrap } };
    }
    const state = editor.prosemirrorState;
    const { bnBlock } = getBlockInfoFromTransaction(state.tr);
    const currentBlock = nodeToBlock(bnBlock.node, state.schema);
    const content = currentBlock.content as any;

    const stripLeadingTrigger = (
      c: any,
    ): { hasTrigger: boolean; content: any } => {
      if (!Array.isArray(c) || c.length === 0 || c[0]?.type !== "text") {
        return { hasTrigger: false, content: c };
      }
      const text = c[0].text || "";
      const trigger = text.startsWith("/")
        ? "/"
        : text.startsWith("、")
          ? "、"
          : null;
      if (!trigger) return { hasTrigger: false, content: c };
      // Only strip the command up to the caret; preserve trailing inline marks
      // and children without dispatching a separate deletion transaction.
      const { $from, empty } = editor.prosemirrorState.selection;
      if (!empty || $from.parentOffset < trigger.length) {
        return { hasTrigger: false, content: c };
      }
      return {
        hasTrigger: true,
        content: contentNodeToInlineContent(
          $from.parent.cut($from.parentOffset),
          editor.schema.inlineContentSchema,
          editor.schema.styleSchema,
        ),
      };
    };

    const stripped = stripLeadingTrigger(content);
    const hasTrigger = stripped.hasTrigger;
    // The menu clears its query before calling the item. A remaining suffix at
    // the start of the block still belongs to the block being converted.
    const selection = editor.prosemirrorState.selection;
    const hasClearedPrefix = !hasTrigger && selection.empty && selection.$from.parentOffset === 0;

    let target: any;
    if (hasTrigger || hasClearedPrefix) {
      const targetKind = (editor.schema as any).blockSchema?.[block.type]
        ?.content;
      target = updateCurrentSlashBlock(
        editor,
        targetKind === "inline"
          ? { ...block, content: stripped.content }
          : block,
      );
    } else {
      const isEmpty =
        !content ||
        (Array.isArray(content) && content.length === 0) ||
        (typeof content === "string" && content.trim() === "");
      if (isEmpty) {
        target = updateCurrentSlashBlock(editor, block);
      } else {
        const [inserted] = editor.insertBlocks([block], currentBlock, "after");
        target = inserted;
      }
    }
    if (target?.id) focusAndScrollTo(target, target?.id === currentBlock.id);
    return target;
  };
}
