export function flattenLegacyColumnClipboard(root: HTMLElement): void {
  const contents = root.querySelectorAll<HTMLElement>(
    '[data-content-type="columnLayout"], [data-content-type="columnSection"]',
  );
  for (let index = contents.length - 1; index >= 0; index -= 1) {
    const container = contents[index].closest<HTMLElement>('[data-node-type="blockContainer"]');
    if (!container || container === root) continue;
    const group = Array.from(container.children).find(
      child => child.getAttribute("data-node-type") === "blockGroup",
    );
    if (!group) continue;
    const fragment = container.ownerDocument.createDocumentFragment();
    while (group.firstChild) fragment.appendChild(group.firstChild);
    container.replaceWith(fragment);
  }
}
