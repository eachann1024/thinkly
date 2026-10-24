import { isImeKeyboardEvent } from "@/hooks/useImeInput";
import { FIXED_ESCAPE_SHORTCUT } from "@/lib/fixed-app-shortcuts";
import { matchShortcut } from "@/lib/shortcut-match";

export const OPEN_DIALOG_SELECTOR =
  'dialog[open], :is([role="dialog"], [role="alertdialog"]):not([data-state="closed"]):not([hidden]):not([aria-hidden="true"])';
export const OPEN_ESCAPE_LAYER_SELECTOR = `${OPEN_DIALOG_SELECTOR}, [role="menu"]:not([data-state="closed"]):not([hidden]), [data-goose-floating-content][data-state="open"]`;
export const OPEN_TOAST_SELECTOR = '[data-sonner-toast]:not([data-removed="true"])';

export function registerEscapeClose(options: {
  document: Document;
  window: Window;
  enabled: () => boolean;
  dismissToasts: () => void;
  closeContent: () => void;
}): () => void {
  const { document: root, window: host } = options;
  const blocked = new WeakSet<KeyboardEvent>();
  let disposed = false;
  const capture = (event: KeyboardEvent) => {
    if (!matchShortcut(event, FIXED_ESCAPE_SHORTCUT)) return;
    const target = event.target as HTMLElement | null;
    if (!options.enabled() || event.defaultPrevented || target?.closest?.('[data-shortcut-recorder]')) {
      blocked.add(event);
      return;
    }
    if (isImeKeyboardEvent(event)) {
      blocked.add(event);
      if (root.querySelector(OPEN_ESCAPE_LAYER_SELECTOR)) event.stopImmediatePropagation();
      return;
    }
    if (event.repeat) {
      blocked.add(event);
      event.stopImmediatePropagation();
      return;
    }
    if (root.querySelector(OPEN_TOAST_SELECTOR)) {
      blocked.add(event);
      event.preventDefault();
      event.stopImmediatePropagation();
      options.dismissToasts();
      return;
    }
    if (event.target === root || root.querySelector(OPEN_ESCAPE_LAYER_SELECTOR)) blocked.add(event);
  };
  const bubble = (event: KeyboardEvent) => {
    if (!matchShortcut(event, FIXED_ESCAPE_SHORTCUT) || blocked.has(event)) return;
    queueMicrotask(() => {
      if (disposed || event.defaultPrevented || isImeKeyboardEvent(event) || event.repeat || !options.enabled()) return;
      event.preventDefault();
      options.closeContent();
    });
  };
  host.addEventListener('keydown', capture, true);
  host.addEventListener('keydown', bubble);
  return () => {
    disposed = true;
    host.removeEventListener('keydown', capture, true);
    host.removeEventListener('keydown', bubble);
  };
}
