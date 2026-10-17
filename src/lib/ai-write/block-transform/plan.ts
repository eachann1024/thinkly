import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/lib/ai-write/block-transform/plan.ts#messages:1">`
zh-Hans:
  detailToConvertToSelectCompleteBlocksFromThe: "{{value1}}转换需要选择完整的内容块，请从行首重新选择到行尾。"
  detailTheTargetBlocksForConversionToHaveChanged: "{{value1}}转换的目标块已变化，请重新选择后再试。"
  detailTheTargetContentForConversionToHasChanged: "{{value1}}转换的目标内容已变化，请重新选择后再试。"
  detailThereIsNoNonEmptyContentToConvert: "没有可转换为{{value1}}的非空内容。"
en:
  detailToConvertToSelectCompleteBlocksFromThe: "To convert to {{value1}}, select complete blocks from the start of the first line to the end of the last."
  detailTheTargetBlocksForConversionToHaveChanged: "The target blocks for conversion to {{value1}} have changed. Select them again and retry."
  detailTheTargetContentForConversionToHasChanged: "The target content for conversion to {{value1}} has changed. Select it again and retry."
  detailThereIsNoNonEmptyContentToConvert: "There is no non-empty content to convert to {{value1}}."
`;
const t = createTranslator(messages);
import {
  cloneValue,
  getBlockTypeTransformSignature,
  type BlockTypeTransformSelectionSnapshot,
  type BlockTypeTransformBlock,
  type BlockTypeTransformIntent,
  type BlockTypeTransformPlan,
} from "./types";
import { assertValidIntent, getBlockTypeTransformTargetLabel } from "./intent";
import {
  validateSourceBlocks,
  splitBlockContent,
  createReplacementBlock,
  assertReplacementStructure,
} from "./content";

export function planBlockTypeTransform(
  snapshot: BlockTypeTransformSelectionSnapshot,
  currentBlocks: BlockTypeTransformBlock[],
  intent: BlockTypeTransformIntent = { blockType: "checkListItem" },
): BlockTypeTransformPlan {
  assertValidIntent(intent);
  const targetLabel = getBlockTypeTransformTargetLabel(intent);
  if (!snapshot.wholeBlocks) {
    throw new Error(
      t("detailToConvertToSelectCompleteBlocksFromThe", { value1: targetLabel }),
    );
  }

  const startIndex = currentBlocks.findIndex(
    (block) => block.id === snapshot.startBlockId,
  );
  const endIndex = currentBlocks.findIndex(
    (block) => block.id === snapshot.endBlockId,
  );
  if (startIndex < 0 || endIndex < startIndex) {
    throw new Error(t("detailTheTargetBlocksForConversionToHaveChanged", { value1: targetLabel }));
  }

  const sourceBlocks = currentBlocks.slice(startIndex, endIndex + 1);
  if (
    sourceBlocks.length !== snapshot.blocks.length ||
    getBlockTypeTransformSignature(sourceBlocks) !== snapshot.signature
  ) {
    throw new Error(t("detailTheTargetContentForConversionToHasChanged", { value1: targetLabel }));
  }
  validateSourceBlocks(sourceBlocks, targetLabel);

  const splitsHardLines = [
    "bulletListItem",
    "numberedListItem",
    "checkListItem",
  ].includes(intent.blockType);
  const replacementBlocks = sourceBlocks.flatMap((block) => {
    const contents = splitsHardLines
      ? splitBlockContent(block.content)
      : [block.content ?? ""];
    return contents.map((content) =>
      createReplacementBlock(block, content, intent),
    );
  });
  if (!replacementBlocks.length) {
    throw new Error(t("detailThereIsNoNonEmptyContentToConvert", { value1: targetLabel }));
  }
  assertReplacementStructure(replacementBlocks, intent);

  return {
    startBlockId: snapshot.startBlockId,
    endBlockId: snapshot.endBlockId,
    sourceBlockIds: sourceBlocks.map((block) => block.id as string),
    replacementBlocks,
    convertedCount: replacementBlocks.length,
    target: cloneValue(intent),
  };
}
