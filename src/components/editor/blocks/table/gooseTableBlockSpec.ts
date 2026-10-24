import { withLiveColumnResize } from "./liveColumnResize";
import { defaultBlockSpecs } from "@blocknote/core/blocks";
import type {
  BlockFromConfigNoChildren,
  Extension,
  ExtensionFactoryInstance,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import type { TableHandlesState } from "@blocknote/core/extensions";
import type { Node } from "@tiptap/core";

function allowCoveredRows(extension: Extension): Extension {
  return {
    ...extension,
    tiptapExtensions: extension.tiptapExtensions?.map((node) => node.name === "tableRow"
      ? (node as Node).extend({ content: "(tableCell | tableHeader)*" })
      : node.name === "BlockNoteTableExtension"
        ? node.extend({
            addProseMirrorPlugins() {
              return (this.parent?.() ?? []).map(withLiveColumnResize);
            },
          })
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
      addNodeView() {
        const render = this.parent?.();
        if (!render) return null;
        return (props) => {
          const view = render(props);
          const syncWidth = () => {
            const table = (view.dom as HTMLElement).querySelector("table");
            if (table?.style.width) table.style.setProperty("width", table.style.width, "important");
          };
          const update = view.update?.bind(view);
          if (update) view.update = (...args) => {
            const accepted = update(...args);
            if (accepted) syncWidth();
            return accepted;
          };
          syncWidth();
          return view;
        };
      },
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

export type GooseTableBlock = BlockFromConfigNoChildren<
  typeof gooseTableBlockSpec.config,
  InlineContentSchema,
  StyleSchema
>;

// BlockNote 的 TableHandlesState 把 block 固定为默认表格 schema，看不到这里新增的 props。
export type GooseTableHandlesState = Omit<TableHandlesState, "block"> & { block: GooseTableBlock };
