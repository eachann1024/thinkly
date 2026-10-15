import { createBlockConfig, createBlockSpec, defaultProps } from "@blocknote/core";
import { addDefaultPropsExternalHTML, parseDefaultProps } from "@blocknote/core/blocks";
import {
  createPersistentToggleWrapper,
  createToggleExternalHTML,
  parseToggleDetailsContent,
} from "./toggleBlockHelpers";

const toggleConfig = createBlockConfig(() => ({
  type: "toggleListItem" as const,
  propSchema: { ...defaultProps, collapsed: { default: false } },
  content: "inline" as const,
}));

export const gooseToggleListItemBlockSpec = createBlockSpec(toggleConfig, {
  meta: { isolating: false },
  parse(element) {
    const details = element.tagName === "DETAILS"
      ? element
      : element.tagName === "LI" ? element.querySelector(":scope > details") : null;
    if (!details || details.querySelector(":scope > summary > h1, :scope > summary > h2, :scope > summary > h3")) return undefined;
    return { ...parseDefaultProps(element), collapsed: !details.hasAttribute("open") };
  },
  parseContent: ({ el, schema }) => {
    const details = el.tagName === "DETAILS" ? el : el.querySelector(":scope > details");
    return details ? parseToggleDetailsContent(details as HTMLElement, schema, "toggleListItem") : undefined;
  },
  runsBefore: ["bulletListItem"],
  render(block, editor) {
    const contentDOM = document.createElement("p");
    return { ...createPersistentToggleWrapper(block, editor, contentDOM), contentDOM };
  },
  toExternalHTML(block) {
    const contentDOM = document.createElement("p");
    addDefaultPropsExternalHTML(block.props, contentDOM);
    return createToggleExternalHTML(contentDOM, block.props.collapsed);
  },
})();
