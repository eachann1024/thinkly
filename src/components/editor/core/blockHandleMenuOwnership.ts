export function blockHandleSuggestionOwner(root: HTMLElement): string | undefined {
  const marker = root.querySelector<HTMLElement>(".bn-suggestion-decorator[data-decoration-id]");
  const selector = '[data-node-type="blockContainer"]';
  const block = marker?.matches(selector) ? marker : marker?.querySelector<HTMLElement>(selector) ?? marker?.closest<HTMLElement>(selector);
  return block?.dataset.id;
}
