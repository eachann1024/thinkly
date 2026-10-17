import type { PartialBlock } from "@blocknote/core";
import {
  cloneValue,
  type BlockTypeTransformBlock,
  type BlockTypeTransformIntent,
} from "./types";
import { assertValidIntent } from "./intent";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/lib/ai-write/block-transform/content.ts#messages:1">`
zh-Hans:
  thereAreNoTextBlocksToConvert: "没有可转换的文本块。"
  theSelectedBlocksAreMissingIdsSelectThem: "选区块缺少标识，请重新选择后再试。"
  theConversionProducedTheWrongBlockTypeYour: "转换计划生成了错误的块类型，内容未修改。"
  theConversionProducedTheWrongHeadingLevelYour: "转换计划生成了错误的标题级别，内容未修改。"
  detailTheSelectionContainsBlocksThatCannotBeConverted: "选区包含不能转换为{{value1}}的块。"
  detailTheSelectionContainsNestedContentAndCannotBe: "选区包含嵌套内容，暂不能安全转换为{{value1}}。"
en:
  thereAreNoTextBlocksToConvert: "There are no text blocks to convert."
  theSelectedBlocksAreMissingIdsSelectThem: "The selected blocks are missing IDs. Select them again and retry."
  theConversionProducedTheWrongBlockTypeYour: "The conversion produced the wrong block type. Your content was not changed."
  theConversionProducedTheWrongHeadingLevelYour: "The conversion produced the wrong heading level. Your content was not changed."
  detailTheSelectionContainsBlocksThatCannotBeConverted: "The selection contains blocks that cannot be converted to {{value1}}."
  detailTheSelectionContainsNestedContentAndCannotBe: "The selection contains nested content and cannot be safely converted to {{value1}} yet."
ja:
  thereAreNoTextBlocksToConvert: "変換できるテキストブロックがありません。"
  theSelectedBlocksAreMissingIdsSelectThem: "選択したブロックに ID がありません。選択し直してからやり直してください。"
  theConversionProducedTheWrongBlockTypeYour: "変換結果のブロックタイプが正しくありません。内容は変更されていません。"
  theConversionProducedTheWrongHeadingLevelYour: "変換結果の見出しレベルが正しくありません。内容は変更されていません。"
  detailTheSelectionContainsBlocksThatCannotBeConverted: "選択範囲に{{value1}}へ変換できないブロックが含まれています。"
  detailTheSelectionContainsNestedContentAndCannotBe: "選択範囲にネストされた内容が含まれているため、現在は{{value1}}へ安全に変換できません。"
`;
const t = createTranslator(messages);


const SUPPORTED_SOURCE_BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "bulletListItem",
  "numberedListItem",
  "checkListItem",
  "quote",
  "codeBlock",
  "toggleListItem",
]);

export function inlineContentText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const value = item as Record<string, unknown>;
      if (typeof value.text === "string") return value.text;
      return inlineContentText(value.content);
    })
    .join("");
}

function splitInlineArray(content: unknown[]): unknown[][] {
  const lines: unknown[][] = [[]];
  const nextLine = () => lines.push([]);

  for (const rawItem of content) {
    if (!rawItem || typeof rawItem !== "object") {
      lines[lines.length - 1].push(cloneValue(rawItem));
      continue;
    }

    const item = rawItem as Record<string, unknown>;
    if (item.type === "link" && Array.isArray(item.content)) {
      const linkLines = splitInlineArray(item.content);
      linkLines.forEach((line, index) => {
        if (line.length > 0) {
          lines[lines.length - 1].push({
            ...cloneValue(item),
            content: line,
          });
        }
        if (index < linkLines.length - 1) nextLine();
      });
      continue;
    }

    if (typeof item.text !== "string" || !item.text.includes("\n")) {
      lines[lines.length - 1].push(cloneValue(item));
      continue;
    }

    const parts = item.text.split("\n");
    parts.forEach((text, index) => {
      if (text) lines[lines.length - 1].push({ ...cloneValue(item), text });
      if (index < parts.length - 1) nextLine();
    });
  }

  return lines;
}

export function splitBlockContent(content: unknown): unknown[] {
  if (typeof content === "string") {
    return content.split("\n").filter((line) => line.trim().length > 0);
  }
  if (!Array.isArray(content)) return [];
  return splitInlineArray(content).filter(
    (line) => line.length > 0 && inlineContentText(line).trim().length > 0,
  );
}

function getPresentationProps(props: Record<string, unknown> | undefined) {
  const commonProps: Record<string, unknown> = {};
  if (!props) return commonProps;
  for (const key of ["textAlignment", "textColor", "backgroundColor"]) {
    if (key in props) commonProps[key] = props[key];
  }
  return commonProps;
}

export function createReplacementBlock(
  block: BlockTypeTransformBlock,
  content: unknown,
  intent: BlockTypeTransformIntent,
): PartialBlock {
  const props = getPresentationProps(block.props);
  if (intent.blockType === "heading") props.level = intent.headingLevel;
  if (intent.blockType === "checkListItem") {
    props.checked =
      block.type === "checkListItem" && block.props?.checked === true;
  }

  return {
    type: intent.blockType,
    props,
    content:
      intent.blockType === "codeBlock"
        ? inlineContentText(content)
        : cloneValue(content),
  } as PartialBlock;
}

export function validateSourceBlocks(
  blocks: BlockTypeTransformBlock[],
  targetLabel: string,
) {
  if (blocks.length === 0) throw new Error(t("thereAreNoTextBlocksToConvert"));

  for (const block of blocks) {
    if (!block.id) throw new Error(t("theSelectedBlocksAreMissingIdsSelectThem"));
    if (!block.type || !SUPPORTED_SOURCE_BLOCK_TYPES.has(block.type)) {
      throw new Error(t("detailTheSelectionContainsBlocksThatCannotBeConverted", { value1: targetLabel }));
    }
    if (block.children?.length) {
      throw new Error(t("detailTheSelectionContainsNestedContentAndCannotBe", { value1: targetLabel }));
    }
  }
}

export function assertReplacementStructure(
  blocks: PartialBlock[],
  intent: BlockTypeTransformIntent,
) {
  assertValidIntent(intent);
  for (const block of blocks) {
    if (block.type !== intent.blockType) {
      throw new Error(t("theConversionProducedTheWrongBlockTypeYour"));
    }
    if (
      intent.blockType === "heading" &&
      (block.props as Record<string, unknown> | undefined)?.level !==
        intent.headingLevel
    ) {
      throw new Error(t("theConversionProducedTheWrongHeadingLevelYour"));
    }
  }
}
