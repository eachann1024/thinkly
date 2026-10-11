import { useEffect } from "react";
import { editableTarget, textCaretBox } from "@/lib/textCaretGeometry";
import "@/styles/global/text-caret.css";

/** One caret overlay for inputs and editors, with native IME fallback. */
export function useTextCaret() {
  useEffect(() => {
    const caret = document.createElement("div");
    caret.className = "goose-text-caret";
    caret.setAttribute("aria-hidden", "true");
    caret.hidden = true;
    const mirror = document.createElement("div");
    mirror.setAttribute("aria-hidden", "true");
    mirror.style.display = "none";
    document.body.append(caret, mirror);
    let owner: HTMLElement | null = null;
    let composing = false;
    let frame: number | null = null;
    let geometry = "";
    const hide = () => {
      owner?.removeAttribute("data-goose-caret-active");
      owner = null;
      caret.hidden = true;
      geometry = "";
    };
    const update = () => {
      frame = null;
      const el = editableTarget();
      if (!el || composing || !document.hasFocus()) { hide(); return; }
      const box = textCaretBox(el, mirror);
      if (!box) { hide(); return; }
      if (owner !== el) { hide(); owner = el; }
      el.setAttribute("data-goose-caret-active", "true");
      const next = `${box.left}:${box.top}:${box.height}`;
      if (next !== geometry) {
        geometry = next;
        caret.style.transform = `translate3d(${box.left}px, ${box.top}px, 0)`;
        caret.style.height = `${box.height}px`;
        for (const animation of caret.getAnimations()) animation.currentTime = 0;
      }
      caret.hidden = false;
    };
    const schedule = () => {
      if (frame === null) frame = requestAnimationFrame(update);
    };
    const compositionStart = () => { composing = true; hide(); };
    const compositionEnd = () => { composing = false; schedule(); };
    const focusOut = () => { composing = false; hide(); schedule(); };
    const events = ["focusin", "input", "selectionchange", "keyup", "pointerup", "scroll"];
    for (const event of events) document.addEventListener(event, schedule, true);
    document.addEventListener("focusout", focusOut, true);
    document.addEventListener("compositionstart", compositionStart, true);
    document.addEventListener("compositionend", compositionEnd, true);
    window.addEventListener("resize", schedule);
    window.addEventListener("blur", hide);
    window.addEventListener("focus", schedule);
    const appearance = new MutationObserver(schedule);
    appearance.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class", "data-goose-accent"] });
    schedule();
    return () => {
      hide();
      if (frame !== null) cancelAnimationFrame(frame);
      for (const event of events) document.removeEventListener(event, schedule, true);
      document.removeEventListener("focusout", focusOut, true);
      document.removeEventListener("compositionstart", compositionStart, true);
      document.removeEventListener("compositionend", compositionEnd, true);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("blur", hide);
      window.removeEventListener("focus", schedule);
      appearance.disconnect();
      caret.remove();
      mirror.remove();
    };
  }, []);
}
