import type { BlockNoteEditor } from "@blocknote/core";
import { createToggleWrapper, mergeParagraphs } from "@blocknote/core/blocks";
import { DOMParser, Fragment, type Schema } from "prosemirror-model";
import { readToggleCollapsed } from "../../core/toggleBlocks";
import { i18nYaml, createTranslator, subscribeLanguage } from "@/i18n";
const messages = i18nYaml<"src/components/editor/blocks/toggle/toggleBlockHelpers.ts#messages:1">`
zh-Hans:
  expandOrCollapseChildBlocks: "展开或收起子块"
en:
  expandOrCollapseChildBlocks: "Expand or collapse child blocks"
ja:
  expandOrCollapseChildBlocks: "子ブロックを展開または折りたたむ"
`;
const t = createTranslator(messages);


export function createPersistentToggleWrapper(
  block: any,
  editor: BlockNoteEditor<any, any, any>,
  contentDOM: HTMLElement,
) {
  const wrapper = createToggleWrapper(block, editor, contentDOM, {
    get: (current) => !readToggleCollapsed(current),
    set: (current, open) => {
      if (!current || !editor.isEditable || readToggleCollapsed(current) === !open) return;
      editor.updateBlock(current, { props: { collapsed: !open } });
    },
  });
  const button = wrapper.dom.querySelector<HTMLButtonElement>(".bn-toggle-button");
  if (button) {
    button.setAttribute("aria-label", t("expandOrCollapseChildBlocks"));
    button.setAttribute("aria-expanded", String(!readToggleCollapsed(block)));
  }
  const refreshLanguage = () => {
    button?.setAttribute("aria-label", t("expandOrCollapseChildBlocks"));
    const add = wrapper.dom.querySelector<HTMLElement>(".bn-toggle-add-block-button");
    if (add) add.textContent = editor.dictionary.toggle_blocks.add_block_button;
  };
  const unsubscribe = subscribeLanguage(refreshLanguage);
  button?.addEventListener("click", refreshLanguage);
  return {
    ...wrapper,
    ignoreMutation: (mutation: Parameters<NonNullable<typeof wrapper.ignoreMutation>>[0]) => {
      const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
      if (target?.closest(".bn-toggle-button, .bn-toggle-add-block-button")) return true;
      return wrapper.ignoreMutation?.(mutation) ?? false;
    },
    destroy: () => {
      unsubscribe();
      button?.removeEventListener("click", refreshLanguage);
      wrapper.destroy?.();
    },
  };
}

export function parseToggleDetailsContent(
  details: HTMLElement,
  schema: Schema,
  nodeName: "heading" | "toggleListItem",
): Fragment {
  const parser = DOMParser.fromSchema(schema);
  const summary = details.querySelector(":scope > summary");
  const summaryClone = summary?.cloneNode(true) as HTMLElement | undefined;
  if (summaryClone) mergeParagraphs(summaryClone);
  const inlineRoot = summaryClone?.childElementCount === 1
    ? (summaryClone.querySelector(":scope > h1, :scope > h2, :scope > h3, :scope > p") ?? summaryClone)
    : summaryClone;
  const inline = inlineRoot
    ? parser.parse(inlineRoot, {
        topNode: schema.nodes.paragraph.create(),
        preserveWhitespace: true,
      }).content
    : Fragment.empty;
  const children = document.createElement("div");
  children.setAttribute("data-node-type", "blockGroup");
  for (const child of Array.from(details.childNodes)) {
    if ((child as HTMLElement).tagName === "SUMMARY") continue;
    if (child.nodeType === 3 && !child.textContent?.trim()) continue;
    children.appendChild(child.cloneNode(true));
  }
  const content = schema.nodes[nodeName].create({}, inline).content;
  if (!children.childNodes.length) return content;
  const group = parser.parse(children, { topNode: schema.nodes.blockGroup.create() });
  return group.content.size ? content.addToEnd(group) : content;
}

export function createToggleExternalHTML(contentDOM: HTMLElement, collapsed: boolean) {
  const dom = document.createElement("details");
  if (!collapsed) dom.setAttribute("open", "");
  const summary = document.createElement("summary");
  summary.appendChild(contentDOM);
  dom.appendChild(summary);
  return { dom, contentDOM, childrenDOM: dom };
}
