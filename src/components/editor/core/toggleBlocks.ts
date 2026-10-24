export type ToggleBlock = {
  id: string;
  type: string;
  props?: unknown;
  children?: unknown[];
};

export function isToggleBlock(block: ToggleBlock): boolean {
  return block.type === "toggleListItem" || (
    block.type === "heading" &&
    (block.props as { isToggleable?: boolean } | undefined)?.isToggleable === true
  );
}

export function readToggleCollapsed(block: ToggleBlock): boolean {
  const value = (block.props as { collapsed?: unknown } | undefined)?.collapsed;
  return value === true || value === "true";
}

export function findParentBlock(
  blocks: ToggleBlock[],
  id: string,
  parent: ToggleBlock | null = null,
): ToggleBlock | null | undefined {
  for (const block of blocks) {
    if (block.id === id) return parent;
    if (block.children?.length) {
      const found = findParentBlock(block.children as ToggleBlock[], id, block);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}
