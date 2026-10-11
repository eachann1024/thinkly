export function hasSidebarInteraction(sidebar: HTMLElement | null): boolean {
  const active = document.activeElement;
  if (
    sidebar?.contains(active) &&
    active instanceof HTMLElement &&
    active.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [data-shortcut-recorder]',
    )
  )
    return true;
  return hasSidebarFloatingInteraction();
}

export function hasSidebarFloatingInteraction(): boolean {
  return Boolean(
    document.querySelector(
      'dialog[open], :is([role="dialog"], [role="alertdialog"], [role="menu"]):not([data-state="closed"]):not([hidden]):not([aria-hidden="true"]), [data-goose-floating-content][data-state="open"]',
    ),
  );
}
