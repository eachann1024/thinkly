import type { TextField } from "./textCaretGeometry";

/**
 * 镜像 div 的字宽和 input/textarea 不一致，插入点会落在末字里面。
 * 这里用输入框自己的命中测试：偏移在字形中点切换，两端再用相邻字距外推。
 */
export function fieldCaretLeft(el: TextField, style: CSSStyleDeclaration, lineY: number): number | null {
  const start = el.selectionStart;
  if (start === null || start !== el.selectionEnd) return null;
  const hit = document.caretPositionFromPoint?.bind(document);
  if (!hit) return null;

  const box = el.getBoundingClientRect();
  const scaleX = box.width / el.offsetWidth || 1;
  const scaleY = box.height / el.offsetHeight || 1;
  const edge = (border: string, padding: string, scale: number) =>
    ((parseFloat(style.getPropertyValue(border)) || 0) + (parseFloat(style.getPropertyValue(padding)) || 0)) * scale;
  const contentLeft = box.left + edge("border-left-width", "padding-left", scaleX);
  const contentRight = box.right - edge("border-right-width", "padding-right", scaleX);
  const contentTop = box.top + edge("border-top-width", "padding-top", scaleY);
  const contentBottom = box.bottom - edge("border-bottom-width", "padding-bottom", scaleY);
  if (!(contentRight > contentLeft + 1) || !(contentBottom > contentTop + 1)) return null;

  const y = Math.min(contentBottom - 1, Math.max(contentTop + 1, lineY));
  const offsetAt = (x: number): number | null => {
    const pos = hit(Math.min(contentRight - 1, Math.max(contentLeft + 1, x)), y);
    if (!pos) return null;
    const node = pos.offsetNode;
    if (node !== el && !el.contains(node)) return null;
    return pos.offset;
  };
  if (!el.value.length) return contentLeft + (parseFloat(style.textIndent) || 0) * scaleX;

  const atLeft = offsetAt(contentLeft);
  const atRight = offsetAt(contentRight);
  // 空行整段都是同一个插入点，光标贴在行首。
  if (atLeft !== null && atLeft === atRight && (start === 0 || el.value[start - 1] === "\n")) return contentLeft;

  const fontSize = (parseFloat(style.fontSize) || 16) * scaleX;
  const center = (index: number): number | null => {
    let lo = contentLeft;
    let hi = contentRight;
    for (let i = 0; i < 16; i++) {
      const mid = (lo + hi) / 2;
      const offset = offsetAt(mid);
      if (offset === null) return null;
      if (offset <= index) lo = mid;
      else hi = mid;
    }
    const x = (lo + hi) / 2;
    if (x - contentLeft < 0.75 || contentRight - x < 0.75) return null;
    return x;
  };

  const before = start > 0 ? center(start - 1) : null;
  const after = start < el.value.length ? center(start) : null;
  let left: number | null = null;
  if (before !== null && after !== null && after > before + 0.5) left = (before + after) / 2;
  else if (before !== null) {
    const prev = start > 1 ? center(start - 2) : null;
    const half = prev !== null && before - prev > 0.5 ? (before - prev) / 2 : fontSize / 2;
    left = before + half;
  } else if (after !== null) {
    const next = start + 1 < el.value.length ? center(start + 1) : null;
    const half = next !== null && next - after > 0.5 ? (next - after) / 2 : fontSize / 2;
    left = after - half;
  }
  if (left === null) return null;
  return Math.min(contentRight, Math.max(contentLeft, left));
}
