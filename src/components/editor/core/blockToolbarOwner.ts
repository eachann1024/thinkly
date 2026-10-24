const editorOwners = new WeakMap<object, string>();
let nextOwner = 0;

export function getBlockToolbarOwner(editorRoot: object): string {
  let owner = editorOwners.get(editorRoot);
  if (!owner) {
    owner = `block-editor-${++nextOwner}`;
    editorOwners.set(editorRoot, owner);
  }
  return owner;
}

export function ownsBlockToolbar(
  toolbar: Pick<HTMLElement, "dataset"> | null,
  editorRoot: object,
  blockId: string | null | undefined,
): boolean {
  return Boolean(blockId && toolbar?.dataset.gooseBlockId === blockId &&
    toolbar.dataset.gooseEditorOwner === getBlockToolbarOwner(editorRoot));
}
