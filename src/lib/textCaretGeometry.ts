/** Non-mutating caret geometry; never insert probes into the live editor. */
export type TextField = HTMLInputElement | HTMLTextAreaElement;
export type CaretBox = { left: number; top: number; height: number };

export function editableTarget(): HTMLElement | null {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return null;
  if (active instanceof HTMLTextAreaElement) return active.disabled || active.readOnly ? null : active;
  if (active instanceof HTMLInputElement) {
    return active.selectionStart === null || active.disabled || active.readOnly ? null : active;
  }
  return active.isContentEditable ? active : null;
}

const CARET_EM_RATIO = 1.15;
// 双向文本的视觉插入点由浏览器处理，避免镜像扰动 Unicode bidi 排序。
const BIDI_TEXT = /[\u0590-\u08ff\u200e-\u200f\u202a-\u202e\u2066-\u2069\ufb1d-\ufeff]/;

function trailingNewlineRect(node: Text, el: HTMLElement): DOMRect | null {
  const anchor = node.parentElement;
  if (
    !anchor ||
    !/^(pre|pre-wrap|pre-line|break-spaces)$/.test(getComputedStyle(anchor).whiteSpace)
  ) return null;
  // ProseMirror 用尾部 BR 撑出换行后的空行；换行字符本身的矩形仍在上一行。
  // 高亮 span 可能包住末尾文本，沿祖先找紧随其后的 BR，不越出编辑器。
  let current: Node | null = node;
  while (current && current !== el) {
    if (current.nextSibling) {
      return current.nextSibling instanceof HTMLBRElement
        ? current.nextSibling.getBoundingClientRect()
        : null;
    }
    current = current.parentNode;
  }
  return null;
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
    if (!next && node.data.endsWith("\n")) {
      const trailing = trailingNewlineRect(node, el);
      // 无可靠空行矩形时交回原生光标，不能用上一行换行符的矩形冒充。
      if (!trailing?.height) return null;
      rect = trailing;
    } else {
      rect = probe.getBoundingClientRect();
    }
    if (rect.height) {
      const anchor = node.parentElement ?? el;
      const style = getComputedStyle(anchor);
      const rtl = style.direction === "rtl";
      const fontSize = parseFloat(style.fontSize) || 16;
      const caretHeight = Math.round(fontSize * CARET_EM_RATIO);
      const targetHeight = Math.min(rect.height, caretHeight);
      const insetY = Math.max(0, (rect.height - targetHeight) / 2);
      return { left: next !== rtl ? rect.left : rect.right, top: rect.top + insetY, height: targetHeight };
    }
    return null;
  }
  if (rect.height) {
    const anchor = range.startContainer instanceof HTMLElement ? range.startContainer : range.startContainer.parentElement ?? el;
    const style = getComputedStyle(anchor);
    const fontSize = parseFloat(style.fontSize) || 16;
    const caretHeight = Math.round(fontSize * CARET_EM_RATIO);
    const targetHeight = Math.min(rect.height, caretHeight);
    const insetY = Math.max(0, (rect.height - targetHeight) / 2);
    return { left: rect.left, top: rect.top + insetY, height: targetHeight };
  }
  // Empty paragraph / composer: its own line box supplies the native insertion point.
  const anchor = range.startContainer instanceof HTMLElement ? range.startContainer : range.startContainer.parentElement;
  if (!anchor || anchor.textContent?.replace(/\u200b/g, "").trim()) return null;
  const box = anchor.getBoundingClientRect();
  const style = getComputedStyle(anchor);
  const fontSize = parseFloat(style.fontSize) || 16;
  const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.2;
  const padTop = parseFloat(style.paddingTop || "0");
  const padBottom = parseFloat(style.paddingBottom || "0");
  const contentHeight = Math.max(0, box.height - padTop - padBottom) || lineHeight;
  const blockContent = anchor.closest<HTMLElement>(".bn-block-content");
  // A multiline empty editor starts on its first line, regardless of its min-height.
  const caretLineHeight = blockContent ? contentHeight : Math.min(contentHeight, lineHeight);
  const caretHeight = Math.min(caretLineHeight, Math.round(fontSize * CARET_EM_RATIO));
  const rtl = style.direction === "rtl";
  const caretTop = blockContent
    ? blockContent.getBoundingClientRect().top + Math.max(0, (blockContent.getBoundingClientRect().height - caretHeight) / 2)
    : box.top + padTop + Math.max(0, (caretLineHeight - caretHeight) / 2);
  return {
    left: rtl
      ? box.right - parseFloat(style.paddingRight || "0") - 2
      : box.left + parseFloat(style.paddingLeft || "0"),
    top: caretTop,
    height: caretHeight,
  };
}

/** Cache font setup and clipping ancestors at focus/appearance changes, not on every keystroke. */
export function prepareTextCaret(el: HTMLElement, mirror: HTMLDivElement): () => CaretBox | null {
  const clips: { node: HTMLElement; x: boolean; y: boolean }[] = [];
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    const field = node === el && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement);
    const x = field || /(auto|scroll|hidden|clip)/.test(style.overflowX);
    const y = field || /(auto|scroll|hidden|clip)/.test(style.overflowY);
    if (x || y) clips.push({ node, x, y });
  }
  let measure: () => CaretBox | null = () => editableCaret(el);
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const style = getComputedStyle(el);
    const fontSize = parseFloat(style.fontSize) || 14;
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
    const isInput = el instanceof HTMLInputElement;
    mirror.style.cssText = "position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;contain:layout style paint;";
    for (const key of ["font", "letter-spacing", "line-height", "text-align", "text-indent", "direction", "padding", "border-width", "border-style", "box-sizing", "word-break", "overflow-wrap", "tab-size"]) {
      mirror.style.setProperty(key, style.getPropertyValue(key));
    }
    mirror.style.whiteSpace = isInput ? "pre" : "pre-wrap";
    const prefix = document.createTextNode("");
    const marker = document.createElement("span");
    marker.textContent = "\u200b";
    const suffix = document.createTextNode("");
    mirror.replaceChildren(prefix, marker, suffix);
    let width = 0;
    measure = () => {
      const start = el.selectionStart;
      if (start === null || start !== el.selectionEnd) return null;
      if (style.direction === "rtl" || BIDI_TEXT.test(el.value)) return null;
      const box = el.getBoundingClientRect();
      const nextWidth = el.offsetWidth;
      const scale = box.width / nextWidth || 1;
      if (width !== nextWidth) { width = nextWidth; mirror.style.width = `${width}px`; }
      const value = el.type === "password" ? "•".repeat(start) : el.value.slice(0, start);
      if (prefix.data !== value) prefix.data = value;
      const rest = el.type === "password" ? "•".repeat(el.value.length - start) : el.value.slice(start);
      if (suffix.data !== rest) suffix.data = rest;
      const markerBox = marker.getBoundingClientRect();
      const caretHeight = Math.round(fontSize * CARET_EM_RATIO * scale);

      if (isInput) {
        const borderTop = parseFloat(style.borderTopWidth || "0") * scale;
        const borderBottom = parseFloat(style.borderBottomWidth || "0") * scale;
        const innerHeight = Math.max(0, box.height - borderTop - borderBottom);
        const targetHeight = Math.min(innerHeight, caretHeight);
        const topInset = Math.max(0, (innerHeight - targetHeight) / 2);
        return {
          left: box.left + (markerBox.left - el.scrollLeft) * scale,
          top: box.top + borderTop + topInset,
          height: targetHeight,
        };
      }

      const lineH = Math.max(markerBox.height * scale, lineHeight * scale);
      const targetHeight = Math.min(lineH, caretHeight);
      const lineTop = box.top + (markerBox.top - el.scrollTop) * scale;
      const topInset = Math.max(0, (lineH - targetHeight) / 2);
      return {
        left: box.left + (markerBox.left - el.scrollLeft) * scale,
        top: lineTop + topInset,
        height: targetHeight,
      };
    };
  }
  return () => {
    const caret = measure();
    if (!caret || !Number.isFinite(caret.left + caret.top + caret.height)) return null;
    for (const { node, x, y } of clips) {
      const bounds = node.getBoundingClientRect();
      if (x && (caret.left < bounds.left || caret.left > bounds.right)) return null;
      if (y) {
        const bottom = Math.min(caret.top + caret.height, bounds.bottom);
        caret.top = Math.max(caret.top, bounds.top);
        caret.height = bottom - caret.top;
        if (caret.height <= 0) return null;
      }
    }
    return caret;
  };
}
