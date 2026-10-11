/** Non-mutating caret geometry; never insert probes into the live editor. */
export type TextField = HTMLInputElement | HTMLTextAreaElement;
export type CaretBox = { left: number; top: number; height: number };

export function editableTarget(): HTMLElement | null {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return null;
  if (active.hasAttribute("data-page-title-field")) return null;
  if (active instanceof HTMLTextAreaElement) return active.disabled || active.readOnly ? null : active;
  if (active instanceof HTMLInputElement) {
    return active.selectionStart === null || active.disabled || active.readOnly ? null : active;
  }
  return active.isContentEditable ? active : null;
}

function editableCaret(el: HTMLElement): CaretBox | null {
  const selection = window.getSelection();
  if (!selection?.isCollapsed || !selection.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (!el.contains(range.startContainer)) return null;
  let rect = range.getBoundingClientRect();
  if (!rect.height && range.startContainer.nodeType === Node.TEXT_NODE) {
    const node = range.startContainer as Text;
    const offset = range.startOffset;
    const probe = range.cloneRange();
    const next = offset < node.length;
    if (!next && offset === 0) return null;
    probe.setStart(node, next ? offset : offset - 1);
    probe.setEnd(node, next ? offset + 1 : offset);
    rect = probe.getBoundingClientRect();
    const rtl = getComputedStyle(node.parentElement ?? el).direction === "rtl";
    return rect.height ? { left: next !== rtl ? rect.left : rect.right, top: rect.top, height: rect.height } : null;
  }
  if (rect.height) return { left: rect.left, top: rect.top, height: rect.height };
  // Empty paragraph / composer: its own line box supplies the native insertion point.
  const anchor = range.startContainer instanceof HTMLElement ? range.startContainer : range.startContainer.parentElement;
  if (!anchor || anchor.textContent?.replace(/\u200b/g, "").trim()) return null;
  const box = anchor.getBoundingClientRect();
  const style = getComputedStyle(anchor);
  return {
    left: box.left + parseFloat(style.paddingLeft || "0"),
    top: box.top + parseFloat(style.paddingTop || "0"),
    height: parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2,
  };
}

function fieldCaret(el: TextField, mirror: HTMLDivElement): CaretBox | null {
  const start = el.selectionStart;
  if (start === null || start !== el.selectionEnd) return null;
  const style = getComputedStyle(el);
  const box = el.getBoundingClientRect();
  const scale = box.width / el.offsetWidth || 1;
  mirror.style.cssText = "position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;contain:layout style paint;";
  for (const key of ["font", "letter-spacing", "line-height", "text-align", "text-indent", "direction", "padding", "border-width", "border-style", "box-sizing", "word-break", "overflow-wrap", "tab-size"]) {
    mirror.style.setProperty(key, style.getPropertyValue(key));
  }
  mirror.style.width = `${el.offsetWidth}px`;
  mirror.style.whiteSpace = el instanceof HTMLInputElement ? "pre" : "pre-wrap";
  const value = el.type === "password" ? "•".repeat(el.value.length) : el.value;
  const marker = document.createElement("span");
  marker.textContent = value.slice(start) || "\u200b";
  mirror.replaceChildren(document.createTextNode(value.slice(0, start)), marker);
  const markerBox = marker.getBoundingClientRect();
  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
  return {
    left: box.left + (markerBox.left - el.scrollLeft) * scale,
    top: el instanceof HTMLInputElement ? box.top + (box.height - lineHeight * scale) / 2 : box.top + (markerBox.top - el.scrollTop) * scale,
    height: lineHeight * scale,
  };
}

export function textCaretBox(el: HTMLElement, mirror: HTMLDivElement): CaretBox | null {
  const caret = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? fieldCaret(el, mirror) : editableCaret(el);
  if (!caret || !Number.isFinite(caret.left + caret.top + caret.height)) return null;
  let node: HTMLElement | null = el;
  while (node) {
    const style = getComputedStyle(node);
    const bounds = node.getBoundingClientRect();
    if (/(auto|scroll|hidden|clip)/.test(style.overflowX) && (caret.left < bounds.left || caret.left > bounds.right)) return null;
    if (/(auto|scroll|hidden|clip)/.test(style.overflowY) && (caret.top + caret.height <= bounds.top || caret.top >= bounds.bottom)) return null;
    node = node.parentElement;
  }
  return caret;
}
