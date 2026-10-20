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

const tableSpec = defaultBlockSpecs.table;

// rowspan 覆盖整行时没有起始单元格；默认 + 会补出多余单元格或在重开时 createChecked 失败。
// sequenceColumn 记在表格节点上，右键勾选后才按行追加编号。
export const gooseTableBlockSpec = {
  ...tableSpec,
  config: {
    ...tableSpec.config,
    propSchema: {
      ...tableSpec.config.propSchema,
      sequenceColumn: { default: false },
    },
  },
  implementation: {
    ...tableSpec.implementation,
    node: (tableSpec.implementation as { node: Node }).node.extend({
      addAttributes() {
        return {
          ...(this.parent?.() ?? {}),
          sequenceColumn: {
            default: false,
            keepOnSplit: true,
            parseHTML: (element: HTMLElement) => element.getAttribute("data-sequence-column") === "true",
            renderHTML: (attributes: { sequenceColumn?: boolean }) =>
              attributes.sequenceColumn ? { "data-sequence-column": "true" } : {},
          },
        };
      },
    }),
  },
  extensions: tableSpec.extensions?.map((original) => typeof original === "function"
    ? (context: Parameters<ExtensionFactoryInstance>[0]) => allowCoveredRows(original(context))
    : allowCoveredRows(original)),
};
