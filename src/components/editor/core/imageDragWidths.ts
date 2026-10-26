import { Fragment, Slice, type Node as PMNode } from "@tiptap/pm/model";

export function imageDragWidth(source: HTMLElement, blockId: string): number | undefined {
  const wrapper = source.querySelector<HTMLElement>(
    `[data-node-type="blockContainer"][data-id="${CSS.escape(blockId)}"] [data-content-type="image"] .bn-file-block-content-wrapper`,
  );
  if (!wrapper) return;
  const width = parseFloat(getComputedStyle(wrapper).width);
  return Number.isFinite(width) && width > 0 ? width : undefined;
}

export function preserveImageDragWidths(source: HTMLElement, slice: Slice): Slice {
  let changed = false;
  const mapNode = (node: PMNode, blockId?: string): PMNode => {
    if (node.type.name === "blockContainer") blockId = node.attrs.id;
    if (node.type.name === "image" && node.attrs.showPreview !== false && blockId) {
      const width = imageDragWidth(source, blockId);
      if (width !== undefined && width !== node.attrs.previewWidth) {
        changed = true;
        return node.type.create({ ...node.attrs, previewWidth: width }, node.content, node.marks);
      }
    }
    if (!node.childCount) return node;
    const children: PMNode[] = [];
    node.forEach(child => children.push(mapNode(child, blockId)));
    return node.copy(Fragment.fromArray(children));
  };
  const nodes: PMNode[] = [];
  slice.content.forEach(node => nodes.push(mapNode(node)));
  return changed ? new Slice(Fragment.fromArray(nodes), slice.openStart, slice.openEnd) : slice;
}
