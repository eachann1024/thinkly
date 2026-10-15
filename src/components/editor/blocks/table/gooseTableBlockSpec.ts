import { defaultBlockSpecs } from "@blocknote/core/blocks";
import type { Extension, ExtensionFactoryInstance } from "@blocknote/core";
import type { Node } from "@tiptap/core";

function allowCoveredRows(extension: Extension): Extension {
  return {
    ...extension,
    tiptapExtensions: extension.tiptapExtensions?.map((node) => node.name === "tableRow"
      ? (node as Node).extend({ content: "(tableCell | tableHeader)*" })
      : node),
  };
}

// rowspan 覆盖整行时没有起始单元格；默认 + 会补出多余单元格或在重开时 createChecked 失败。
export const gooseTableBlockSpec = {
  ...defaultBlockSpecs.table,
  extensions: defaultBlockSpecs.table.extensions?.map((original) => typeof original === "function"
    ? (context: Parameters<ExtensionFactoryInstance>[0]) => allowCoveredRows(original(context))
    : allowCoveredRows(original)),
};
