import { createExtension } from "@blocknote/core";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node } from "@tiptap/pm/model";
import { BG_PREVIEW } from "../toolbars/formatting/colorPalette";
import { sanitizeCssColor } from "@/lib/export/markdown/blockPropsProperties";

type ContainerMark = {
  pos: number;
  size: number;
  type: string;
  background: string | null;
};

const marksByDoc = new WeakMap<Node, ContainerMark[]>();

function containerMarks(doc: Node): ContainerMark[] {
  const cached = marksByDoc.get(doc);
  if (cached) return cached;
  const marks: ContainerMark[] = [];
  doc.descendants((node, pos) => {
    if (node.type.spec.tableRole) return false;
    if (node.type.name !== "blockContainer" || node.childCount < 2) return;
    const content = node.firstChild!;
    const type = content.type.name;
    let continuation = false;
    content.forEach((child) => {
      if (child.type.name === "hardBreak") continuation = true;
    });
    const background = sanitizeCssColor(content.attrs.backgroundColor);
    if (!continuation && type !== "callout" && type !== "quote" && (!background || background === "default")) return;
    marks.push({
      pos,
      size: node.nodeSize,
      type,
      background: background && background !== "default" ? background : null,
    });
  });
  marksByDoc.set(doc, marks);
  return marks;
}

export const gooseContainedBlockSurface = createExtension({
  key: "goose-contained-block-surface",
  prosemirrorPlugins: [new Plugin({
    props: {
      decorations(state) {
        const marks = containerMarks(state.doc);
        if (marks.length === 0) return DecorationSet.empty;
        const from = state.selection.from;
        const to = state.selection.to;
        return DecorationSet.create(state.doc, marks.map((mark) => {
          const active = from > mark.pos && to < mark.pos + mark.size;
          return Decoration.node(mark.pos, mark.pos + mark.size, {
            class: `goose-content-container${active ? " goose-content-container-active" : ""}`,
            "data-container-type": mark.type,
            ...(mark.background
              ? { style: `--goose-container-bg:${BG_PREVIEW[mark.background] ?? mark.background}` }
              : {}),
          });
        }));
      },
    },
  })],
});
