import { createBlockSpec } from "@blocknote/core";
import { renderColumnResize } from "./columnResize";
import { readColumnWidths } from "./columnModel";
import "./columns.css";

/** 外部 HTML 也保留 BlockNote 可读的标准容器/子树，避免 void parse rule 吞掉 children。 */
function externalColumnContainer(type: "columnLayout" | "columnSection", widths = "50,50", count = 2) {
  const dom = document.createElement("div");
  dom.dataset.nodeType = "blockContainer";
  const content = document.createElement("div");
  content.dataset.contentType = type;
  const childrenDOM = document.createElement("div");
  childrenDOM.dataset.nodeType = "blockGroup";
  if (type === "columnLayout") {
    dom.dataset.gooseColumns = "v1";
    content.dataset.widths = widths;
    childrenDOM.style.cssText = `display:grid;gap:28px;grid-template-columns:${readColumnWidths(widths, count).map((width) => `minmax(0,${width}fr)`).join(" ")}`;
  } else {
    dom.dataset.gooseColumn = "v1";
    dom.style.minWidth = "0";
  }
  dom.append(content, childrenDOM);
  return { dom, childrenDOM };
}

export const columnLayoutBlockSpec = createBlockSpec({
  type: "columnLayout",
  content: "none",
  propSchema: { widths: { default: "50,50" } },
}, {
  meta: { isolating: true },
  render: renderColumnResize,
  toExternalHTML: (block) => externalColumnContainer("columnLayout", block.props.widths, block.children.length),
})();

export const columnSectionBlockSpec = createBlockSpec({
  type: "columnSection",
  content: "none",
  propSchema: {},
}, {
  meta: { isolating: true },
  render() {
    const dom = document.createElement("div");
    dom.className = "goose-column-section-chrome";
    dom.contentEditable = "false";
    return { dom };
  },
  toExternalHTML: () => externalColumnContainer("columnSection"),
})();
