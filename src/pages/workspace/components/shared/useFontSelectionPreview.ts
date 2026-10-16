import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useReducer,
} from "react";

import { fontSelectionReducer, type FontSelectionEvent } from "./fontSelectionState";

/** Menu session only: preview uses the owning settings value and setter. */
export function useFontSelectionPreview(
  value: string | null,
  onChange: (value: string | null) => void,
) {
  const [state, dispatch] = useReducer(fontSelectionReducer, { status: "closed" });
  const session = useRef(state);
  const send = useCallback((event: FontSelectionEvent) => {
    session.current = fontSelectionReducer(session.current, event);
    dispatch(event);
  }, []);
  const open = state.status !== "closed";
  const current = useRef({ value, onChange });
  useLayoutEffect(() => {
    current.current = { value, onChange };
  }, [value, onChange]);
  const keyboardNavigation = useRef(false);
  const removeListeners = useRef<(() => void) | null>(null);
  const removeConfirmationKeyUp = useRef<(() => void) | null>(null);
  const confirmFont = useCallback((font: string | null) => {
    if (session.current.status === "closed") return;
    send({ type: "confirm", font });
    // An action must confirm even if selection already equals the preview.
    current.current.onChange(font);
    keyboardNavigation.current = false;
    removeConfirmationKeyUp.current?.();
  }, [send]);
  const previewFont = useCallback((font: string | null) => {
    if (session.current.status === "closed") return;
    send({ type: "preview", font });
    current.current.onChange(font);
  }, [send]);

  // React Aria filters capture props on Popover. Attach to its real DOM node,
  // so navigation is observed before the menu moves focus to the next item.
  const contentRef = useCallback(
    (node: HTMLElement | null) => {
      removeListeners.current?.();
      removeListeners.current = null;
      if (!node) return;
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
          const target = event.target;
          const item =
            target instanceof HTMLElement
              ? target.closest<HTMLElement>("[data-font-preview]")
              : null;
          if (
            !item ||
            !node.contains(item) ||
            item.getAttribute("aria-disabled") === "true"
          )
            return;
          // Own this key pair: closing before keyup can send that release to the
          // restored trigger and reopen it through React Aria's press handling.
          event.preventDefault();
          event.stopImmediatePropagation();
          if (event.repeat) return;
          removeConfirmationKeyUp.current?.();
          const font = item.dataset.fontPreview || null;
          const key = event.key;
          const onKeyUp = (release: KeyboardEvent) => {
            if (release.key !== key) return;
            release.preventDefault();
            release.stopImmediatePropagation();
            cleanup();
            confirmFont(font);
          };
          const cleanup = () => {
            document.removeEventListener("keyup", onKeyUp, true);
            window.removeEventListener("blur", cleanup);
            removeConfirmationKeyUp.current = null;
          };
          document.addEventListener("keyup", onKeyUp, true);
          window.addEventListener("blur", cleanup);
          removeConfirmationKeyUp.current = cleanup;
          return;
        }
        keyboardNavigation.current = [
          "ArrowUp",
          "ArrowDown",
          "Home",
          "End",
        ].includes(event.key);
      };
      const onPointerMove = () => {
        keyboardNavigation.current = false;
      };
      const onFocus = (event: FocusEvent) => {
        if (!keyboardNavigation.current || session.current.status === "closed") return;
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const item = target.closest<HTMLElement>("[data-font-preview]");
        if (!item || !node.contains(item)) return;
        keyboardNavigation.current = false;
        previewFont(item.dataset.fontPreview || null);
      };
      node.addEventListener("keydown", onKeyDown, true);
      node.addEventListener("focusin", onFocus, true);
      node.addEventListener("pointermove", onPointerMove, true);
      node.addEventListener("pointerdown", onPointerMove, true);
      removeListeners.current = () => {
        node.removeEventListener("keydown", onKeyDown, true);
        node.removeEventListener("focusin", onFocus, true);
        node.removeEventListener("pointermove", onPointerMove, true);
        node.removeEventListener("pointerdown", onPointerMove, true);
      };
    },
    [confirmFont, previewFont],
  );

  const cancelSession = () => {
    removeConfirmationKeyUp.current?.();
    const previous = session.current;
    send({ type: "cancel" });
    keyboardNavigation.current = false;
    if (previous.status === "previewing") {
      current.current.onChange(previous.original);
    }
  };
  useEffect(
    () => () => {
      removeListeners.current?.();
      removeConfirmationKeyUp.current?.();
      const previous = session.current;
      session.current = { status: "closed" };
      if (previous.status === "previewing") {
        current.current.onChange(previous.original);
      }
    },
    [],
  );

  const onOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      send({ type: "open", original: current.current.value });
      keyboardNavigation.current = false;
    } else {
      cancelSession();
    }
  };

  return { open, onOpenChange, contentRef, confirmFont, previewFont };
}
