export type NestedBlock = {
  id: string;
  type: string;
  content?: unknown;
  children?: NestedBlock[];
};

export function findParentBlock(blocks: NestedBlock[], id: string, parent: NestedBlock | null = null): NestedBlock | null | undefined {
  for (const block of blocks) {
    if (block.id === id) return parent;
    const found = block.children?.length ? findParentBlock(block.children, id, block) : undefined;
    if (found !== undefined) return found;
  }
  return undefined;
}
