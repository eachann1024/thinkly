export function flattenLegacyColumns<T = any>(blocks: T[]): T[] {
  if (!Array.isArray(blocks)) return blocks;
  let result: any[] | undefined;
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index] as any;
    if (!block || typeof block !== "object") {
      result?.push(block);
      continue;
    }
    if (block.type === "columnLayout" || block.type === "columnSection") {
      result ??= blocks.slice(0, index);
      const children = flattenLegacyColumns(Array.isArray(block.children) ? block.children : []);
      for (const child of children) result.push(child);
      continue;
    }
    let flattenedBlock = block;
    if (block.type === "bulletList" || block.type === "orderedList") {
      const content = block.content;
      if (Array.isArray(content)) {
        const flattenedContent = flattenLegacyColumns(content);
        if (flattenedContent !== content) flattenedBlock = { ...flattenedBlock, content: flattenedContent };
      }
    }
    const childrenValue = block.children;
    if (Array.isArray(childrenValue)) {
      const children = flattenLegacyColumns(childrenValue);
      if (children !== childrenValue) {
        flattenedBlock = { ...flattenedBlock, children };
      }
    }
    if (flattenedBlock !== block) {
      result ??= blocks.slice(0, index);
      result.push(flattenedBlock);
    } else result?.push(block);
  }
  return result ?? blocks;
}
