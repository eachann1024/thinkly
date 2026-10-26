export function unfoldLegacyBlocks(blocks: any[]): any[] {
  return blocks.flatMap((block) => {
    if (!block || typeof block !== "object") return [block];
    const children = Array.isArray(block.children) ? unfoldLegacyBlocks(block.children) : [];
    if (block.type !== "heading" && block.type !== "toggleListItem") {
      return [{ ...block, ...(Array.isArray(block.children) ? { children } : {}) }];
    }
    const { children: _children, props, attrs, ...rest } = block;
    const cleanProps = { ...(props ?? attrs ?? {}) };
    delete cleanProps.collapsed;
    delete cleanProps.isToggleable;
    return [{
      ...rest,
      type: block.type === "toggleListItem" ? "paragraph" : "heading",
      ...(Object.keys(cleanProps).length ? { props: cleanProps } : {}),
    }, ...children];
  });
}
