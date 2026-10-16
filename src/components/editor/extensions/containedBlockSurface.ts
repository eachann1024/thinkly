import { createExtension } from "@blocknote/core";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { BG_PREVIEW } from "../toolbars/formatting/colorPalette";
import { sanitizeCssColor } from "@/lib/export/markdown/blockPropsProperties";

/** A container's visible boundary includes its children; no document attributes. */
export const gooseContainedBlockSurface = createExtension({
  key: "goose-contained-block-surface",
  prosemirrorPlugins: [new Plugin({
    props: {
      decorations(state) {
        const decorations: Decoration[] = [];
        state.doc.descendants((node, pos) => {
          if (node.type.name !== "blockContainer" || node.childCount < 2) return;
          const content = node.firstChild!;
          const type = content.type.name;
          let continuation = false;
          content.forEach((child) => { if (child.type.name === "hardBreak") continuation = true; });
          const background = sanitizeCssColor(content.attrs.backgroundColor);
          if (!continuation && type !== "callout" && type !== "quote" && (!background || background === "default")) return;
          const active = state.selection.from > pos && state.selection.to < pos + node.nodeSize;
          decorations.push(Decoration.node(pos, pos + node.nodeSize, {
            class: `goose-content-container${active ? " goose-content-container-active" : ""}`,
            "data-container-type": type,
            ...(background && background !== "default"
              ? { style: `--goose-container-bg:${BG_PREVIEW[background] ?? background}` }
              : {}),
          }));
        });
        return DecorationSet.create(state.doc, decorations);
      },
    },
  })],
});
