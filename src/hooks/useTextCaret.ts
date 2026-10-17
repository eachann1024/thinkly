import { useEffect } from "react";
import { editableTarget, prepareTextCaret, type CaretBox } from "@/lib/textCaretGeometry";
import { textCaretLayer } from "@/lib/textCaretLayer";
import { isTextCaretExposed } from "@/lib/textCaretVisibility";
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
    let measure: (() => CaretBox | null) | null = null;
    let composing = false;
    let frame: number | null = null;
    let geometry = "";
    let anchorLeft = Number.NaN;
    let anchorTop = Number.NaN;
    let anchorWidth = Number.NaN;
    let anchorHeight = Number.NaN;
    let followUntil = 0;
    const hide = () => {
      owner?.removeAttribute("data-goose-caret-active");
      owner = null;
      measure = null;
      caret.hidden = true;
      geometry = "";
      anchorLeft = anchorTop = anchorWidth = anchorHeight = Number.NaN;
      followUntil = 0;
    };
    const ancestorAnimating = (el: HTMLElement) => {
      for (let node: HTMLElement | null = el; node; node = node.parentElement) {
        for (const animation of node.getAnimations()) {
          if (animation.playState === "finished") continue;
          const effect = animation.effect;
          if (!(effect instanceof KeyframeEffect) || effect.getComputedTiming().iterations !== Infinity) return true;
          const moves = effect.getKeyframes().some((frame) =>
            Object.keys(frame).some((key) => /^(transform|translate|top|left|right|bottom|margin|padding|width|height|inset|scale|rotate)/.test(key)),
          );
          if (moves) return true;
        }
      }
      return false;
    };
    // 浮层 transform 和延迟定位发生在 focus 之后，屏幕坐标还会变。
    const follow = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      const shifted = !(
        Math.abs(rect.left - anchorLeft) <= 0.5 &&
        Math.abs(rect.top - anchorTop) <= 0.5 &&
        Math.abs(rect.width - anchorWidth) <= 0.5 &&
        Math.abs(rect.height - anchorHeight) <= 0.5
      );
      anchorLeft = rect.left;
      anchorTop = rect.top;
      anchorWidth = rect.width;
      anchorHeight = rect.height;
      if (shifted) followUntil = Math.max(followUntil, performance.now() + 80);
      if (shifted || ancestorAnimating(el) || performance.now() < followUntil) schedule();
    };
    const update = () => {
      frame = null;
      const el = editableTarget();
      if (!el || composing || !document.hasFocus()) { hide(); return; }
      if (owner !== el) {
        hide();
        owner = el;
        followUntil = performance.now() + 480;
      }
      measure ??= prepareTextCaret(el, mirror);
      const box = measure();
      if (!box) { owner.removeAttribute("data-goose-caret-active"); caret.hidden = true; return; }
      if (!isTextCaretExposed(el, box)) {
        owner.removeAttribute("data-goose-caret-active");
        caret.hidden = true;
        return;
      }
      caret.style.zIndex = String(textCaretLayer(el));
      if (!el.hasAttribute("data-goose-caret-active")) el.setAttribute("data-goose-caret-active", "true");
      const next = `${box.left}:${box.top}:${box.height}`;
      if (next !== geometry) {
        geometry = next;
        caret.style.transform = `translate3d(${box.left}px, ${box.top}px, 0)`;
        caret.style.height = `${box.height}px`;
        for (const animation of caret.getAnimations()) animation.currentTime = 0;
      }
      caret.hidden = false;
    };
    const place = () => {
      const el = editableTarget();
      update();
      if (!composing && document.hasFocus() && el && editableTarget() === el) follow(el);
    };
    const schedule = () => {
      if (frame === null) frame = requestAnimationFrame(place);
    };
    const compositionStart = () => { composing = true; hide(); };
    const compositionEnd = () => { composing = false; schedule(); };
    const focusOut = () => { composing = false; hide(); schedule(); };
    const events = ["focusin", "input", "selectionchange", "keyup", "pointerup", "pointermove", "scroll"];
    for (const event of events) document.addEventListener(event, schedule, true);
    document.addEventListener("focusout", focusOut, true);
    document.addEventListener("compositionstart", compositionStart, true);
    document.addEventListener("compositionend", compositionEnd, true);
    const invalidate = () => { measure = null; schedule(); };
    window.addEventListener("resize", invalidate);
    window.addEventListener("blur", hide);
    window.addEventListener("focus", schedule);
    const appearance = new MutationObserver(invalidate);
    appearance.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class", "data-goose-accent"] });
    const layers = new MutationObserver((records) => {
      if (records.some((record) => record.target !== caret && record.target !== mirror && !mirror.contains(record.target))) schedule();
    });
    layers.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class", "data-goose-layer", "inert", "hidden"] });
    schedule();
    return () => {
      hide();
      if (frame !== null) cancelAnimationFrame(frame);
      for (const event of events) document.removeEventListener(event, schedule, true);
      document.removeEventListener("focusout", focusOut, true);
      document.removeEventListener("compositionstart", compositionStart, true);
      document.removeEventListener("compositionend", compositionEnd, true);
      window.removeEventListener("resize", invalidate);
      window.removeEventListener("blur", hide);
      window.removeEventListener("focus", schedule);
      appearance.disconnect();
      layers.disconnect();
      caret.remove();
      mirror.remove();
    };
  }, []);
}
