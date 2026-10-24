import { createExtension } from "@blocknote/core";

type EditorBlock = {
  id: string;
  type: string;
};

type DividerCursorEditor = {
  schema: {
    blockSpecs?: Record<string, { config?: { content?: string } }>;
  };
  getBlock: (id: string) => EditorBlock | undefined;
  getNextBlock: (block: EditorBlock) => EditorBlock | undefined;
  insertBlocks: (
    blocks: Array<{ type: string; content: never[] }>,
    reference: EditorBlock,
    placement: "after",
  ) => EditorBlock[];
  setTextCursorPosition: (block: EditorBlock, placement: "start") => void;
};

export const DIVIDER_INPUT_RULE_FIND = /^---+\s$/;

export function matchDividerTrigger(
  textBefore: string,
): { triggerText: string } | null {
  const matched = /^---+$/u.exec(textBefore);
  if (!matched) return null;
  return { triggerText: matched[0] };
}

export function moveCursorAfterDivider(
  editor: DividerCursorEditor,
  dividerId: string,
): void {
  const divider = editor.getBlock(dividerId);
  if (!divider || divider.type !== "divider") return;

  const nextBlock = editor.getNextBlock(divider);
  const nextContentType = nextBlock
    ? editor.schema.blockSpecs?.[nextBlock.type]?.config?.content
    : undefined;

  if (nextBlock && nextContentType !== "none") {
    editor.setTextCursorPosition(nextBlock, "start");
    return;
  }

  const [paragraph] = editor.insertBlocks(
    [{ type: "paragraph", content: [] }],
    divider,
    "after",
  );
  if (paragraph) editor.setTextCursorPosition(paragraph, "start");
}

export const gooseDividerInputRuleExtension = createExtension(({ editor }) => ({
  key: "goose-divider-input-rule",
  inputRules: [
    {
      find: DIVIDER_INPUT_RULE_FIND,
      replace() {
        let blockId: string;
        try {
          blockId = editor.getTextCursorPosition().block.id;
        } catch {
          return undefined;
        }

        queueMicrotask(() =>
          moveCursorAfterDivider(
            editor as unknown as DividerCursorEditor,
            blockId,
          ),
        );
        return { type: "divider", props: {}, content: [] } as any;
      },
    },
  ],
}));
