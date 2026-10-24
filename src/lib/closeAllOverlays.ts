export function closeAllOverlays() {
  if (typeof document === "undefined") return;

  document.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      code: "Escape",
      keyCode: 27,
      which: 27,
      bubbles: true,
      cancelable: true,
    }),
  );

  document.dispatchEvent(new CustomEvent("goose-close-link-popover"));
  window.dispatchEvent(new CustomEvent("goose-note:close-ai-workspace"));

  const active = document.activeElement as HTMLElement | null;
  if (active && active !== document.body) {
    active.blur?.();
  }
}
