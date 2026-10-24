// Frozen performance fixture for the previous slash-insertion workspace snapshot.
// It retains the prior two-step range deletion + getBlock content read, while
// matching the current helper's unrelated insertion and focus behavior. This is
// intentionally not sourced from, or claimed to represent, git HEAD.
import { contentNodeToInlineContent, type BlockNoteEditor } from "@blocknote/core";

export function createSlashBlockInsertion(
  editor: BlockNoteEditor<any, any, any>,
  defaultCodeBlockWrap = false,
) {
  const focusAndScrollTo = (block: { id: string }) => {
    try {
      editor.setTextCursorPosition(block, "end");
    } catch {
    }
    editor.focus();
    window.setTimeout(() => {
      try {
        editor.setTextCursorPosition(block, "end");
      } catch {
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
    const currentBlock = editor.getTextCursorPosition().block;
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
      editor.transact((tr) => tr.delete($from.start(), tr.selection.from));
      return {
        hasTrigger: true,
        content: editor.getBlock(currentBlock.id)?.content ?? [],
      };
    };

    const stripped = stripLeadingTrigger(content);
    const hasTrigger = stripped.hasTrigger;

    let target: any;
    if (hasTrigger) {
      const targetKind = (editor.schema as any).blockSchema?.[block.type]
        ?.content;
      target = editor.updateBlock(
        currentBlock,
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
        target = editor.updateBlock(currentBlock, block);
      } else {
        const [inserted] = editor.insertBlocks([block], currentBlock, "after");
        target = inserted;
      }
    }
    if (target?.id) focusAndScrollTo(target);
    return target;
  };
}
