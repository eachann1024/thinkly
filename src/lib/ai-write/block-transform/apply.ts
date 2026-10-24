import { classifyAiLineText } from "../aiLineStructure";
import { inlineContentText } from "./content";
import {
  cloneValue,
  getBlockTypeTransformSignature,
  type BlockTypeTransformBlock,
  type BlockTypeTransformIntent,
  type BlockTypeTransformEditor,
  type BlockTypeTransformResult,
  type BlockTypeTransformSelectionSnapshot,
} from "./types";
import { planBlockTypeTransform } from "./plan";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/lib/ai-write/block-transform/apply.ts#messages:1">`
zh-Hans:
  thereAreNoTextBlocksToConvert: "没有可转换的文本块。"
  theTargetBlockIsNoLongerInThe: "目标块已不在文档中，无法转换。"
  theBlockToConvertCouldNotBeLocated: "无法定位要转换的块。"
en:
  thereAreNoTextBlocksToConvert: "There are no text blocks to convert."
  theTargetBlockIsNoLongerInThe: "The target block is no longer in the document and cannot be converted."
  theBlockToConvertCouldNotBeLocated: "The block to convert could not be located."
ja:
  thereAreNoTextBlocksToConvert: "変換できるテキストブロックがありません。"
  theTargetBlockIsNoLongerInThe: "対象のブロックがドキュメントに存在しないため、変換できません。"
  theBlockToConvertCouldNotBeLocated: "変換するブロックを特定できませんでした。"
`;
const t = createTranslator(messages);


const SKIP_COERCE_TYPES = new Set([
  "heading",
  "codeBlock",
  "table",
  "image",
  "video",
  "file",
  "audio",
  "callout",
  "toggleListItem",
]);

function isCoercibleGeneratedBlock(
  block: BlockTypeTransformBlock,
  intent: BlockTypeTransformIntent,
) {
  if (!block.type || SKIP_COERCE_TYPES.has(block.type)) return false;
  if (block.type === intent.blockType) return true;
  if (
    block.type === "bulletListItem" ||
    block.type === "numberedListItem" ||
    block.type === "checkListItem"
  ) {
    return true;
  }
  if (block.type !== "paragraph" && block.type !== "quote") return false;
  return classifyAiLineText(inlineContentText(block.content)) != null;
}

export function coerceGeneratedBlocksToExpectedType(
  editor: BlockTypeTransformEditor,
  blockIds: string[],
  intent: BlockTypeTransformIntent,
): BlockTypeTransformResult {
  const ids = blockIds.filter((id) => typeof id === "string" && id.length > 0);
  if (ids.length === 0) throw new Error(t("thereAreNoTextBlocksToConvert"));

  const currentBlocks = (editor.document ?? []) as BlockTypeTransformBlock[];
  const byId = new Map(
    currentBlocks.filter((block) => block.id).map((block) => [block.id, block]),
  );
  const live = ids
    .map((id) => byId.get(id))
    .filter((block): block is BlockTypeTransformBlock => Boolean(block?.id));

  let targets = live.filter((block) =>
    isCoercibleGeneratedBlock(block, intent),
  );
  if (targets.length === 0) {
    targets = live.filter((block) => block.type === "paragraph");
  }
  if (targets.length === 0) throw new Error(t("thereAreNoTextBlocksToConvert"));

  let convertedCount = 0;
  editor.transact(() => {
    for (const block of targets) {
      const snapshot: BlockTypeTransformSelectionSnapshot = {
        version: 1,
        pageId: "",
        startBlockId: block.id as string,
        endBlockId: block.id as string,
        blocks: cloneValue([block]),
        signature: getBlockTypeTransformSignature([block]),
        wholeBlocks: true,
      };
      const plan = planBlockTypeTransform(
        snapshot,
        (editor.document ?? []) as BlockTypeTransformBlock[],
        intent,
      );
      editor.replaceBlocks(plan.sourceBlockIds, plan.replacementBlocks);
      convertedCount += plan.convertedCount;
    }
  });

  return { ok: true, convertedCount, target: cloneValue(intent) };
}

export function applyBlockTypeTransformToContiguousIds(
  editor: BlockTypeTransformEditor,
  blockIds: string[],
  intent: BlockTypeTransformIntent,
): BlockTypeTransformResult {
  const ids = blockIds.filter((id) => typeof id === "string" && id.length > 0);
  if (ids.length === 0) throw new Error(t("thereAreNoTextBlocksToConvert"));

  const currentBlocks = (editor.document ?? []) as BlockTypeTransformBlock[];
  const startIndex = currentBlocks.findIndex((block) => block.id === ids[0]);
  const endIndex = currentBlocks.findIndex(
    (block) => block.id === ids[ids.length - 1],
  );
  if (startIndex < 0 || endIndex < startIndex) {
    throw new Error(t("theTargetBlockIsNoLongerInThe"));
  }

  const slice = currentBlocks.slice(startIndex, endIndex + 1);
  const startBlockId = slice[0]?.id;
  const endBlockId = slice[slice.length - 1]?.id;
  if (!startBlockId || !endBlockId) {
    throw new Error(t("theBlockToConvertCouldNotBeLocated"));
  }

  return applyBlockTypeTransformToEditor(
    editor,
    {
      version: 1,
      pageId: "",
      startBlockId,
      endBlockId,
      blocks: cloneValue(slice),
      signature: getBlockTypeTransformSignature(slice),
      wholeBlocks: true,
    },
    intent,
  );
}

export function applyBlockTypeTransformToEditor(
  editor: BlockTypeTransformEditor,
  snapshot: BlockTypeTransformSelectionSnapshot,
  intent: BlockTypeTransformIntent = { blockType: "checkListItem" },
): BlockTypeTransformResult {
  const plan = planBlockTypeTransform(
    snapshot,
    (editor.document ?? []) as BlockTypeTransformBlock[],
    intent,
  );
  editor.transact(() => {
    editor.replaceBlocks(plan.sourceBlockIds, plan.replacementBlocks);
  });
  return {
    ok: true,
    convertedCount: plan.convertedCount,
    target: plan.target,
  };
}
