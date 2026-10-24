export function installCaretProbe() {
  window.__caretRead = () => {
    const e = window.__gooseNoteEditor,
      v = e.prosemirrorView,
      s = v.state.selection;
    const selection = window.getSelection();
    const node = selection?.anchorNode;
    const parent = node?.nodeType === 1 ? node : node?.parentElement;
    const content = parent?.closest("[data-content-type]");
    const tableCell = parent?.closest("td, th");
    const inline = parent?.closest(".bn-inline-content") ?? tableCell?.querySelector(":scope > p");
    const block = parent?.closest('[data-node-type="blockContainer"]');
    const box = (r) =>
      r && { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
    const c = v.coordsAtPos(s.from);
    let glyph = null;
    if (node?.nodeType === 3 && selection.anchorOffset > 0) {
      const r = document.createRange();
      r.setStart(node, selection.anchorOffset - 1);
      r.setEnd(node, selection.anchorOffset);
      glyph = box(r.getBoundingClientRect());
    }
    let firstGlyph = null;
    if (inline) {
      const walker = document.createTreeWalker(inline, NodeFilter.SHOW_TEXT);
      const first = walker.nextNode();
      if (first?.textContent.length) {
        const r = document.createRange();
        r.setStart(first, 0);
        r.setEnd(first, 1);
        firstGlyph = box(r.getBoundingClientRect());
      }
    }
    const br = inline?.querySelector("br:last-child");
    const pseudo = content && getComputedStyle(content, "::after");
    const style = inline && getComputedStyle(inline);
    return {
      id: block?.dataset.id,
      type: content?.dataset.contentType,
      text: inline?.textContent,
      from: s.from,
      to: s.to,
      offset: selection?.anchorOffset,
      collapsed: selection?.isCollapsed,
      caret: box(c),
      glyph,
      firstGlyph,
      br: br && box(br.getBoundingClientRect()),
      inline: inline && box(inline.getBoundingClientRect()),
      native: selection?.rangeCount ? box(selection.getRangeAt(0).getBoundingClientRect()) : null,
      domPosition: node ? v.posAtDOM(node, selection.anchorOffset) : null,
      domFocusPosition: selection?.focusNode ? v.posAtDOM(selection.focusNode, selection.focusOffset) : null,
      focus: v.hasFocus(),
      color: style?.caretColor,
      fontSize: style?.fontSize,
      lineHeight: style?.lineHeight,
      pseudo: pseudo && {
        content: pseudo.content,
        display: pseudo.display,
        fontSize: pseudo.fontSize,
        lineHeight: pseudo.lineHeight,
      },
      html: inline?.innerHTML,
      document: e.document,
    };
  };
}
export function validCaret(s) {
  return (
    s.focus &&
    s.collapsed &&
    s.domPosition === s.from &&
    s.caret &&
    s.caret.bottom > s.caret.top &&
    Number.isFinite(s.caret.left) &&
    s.color !== "rgba(0, 0, 0, 0)" &&
    s.color !== "transparent"
  );
}
export function aligns(s) {
  return (
    validCaret(s) &&
    s.glyph?.height > 0 &&
    Math.abs(s.caret.top - s.glyph.top) <= 1 &&
    Math.abs(s.caret.bottom - s.glyph.bottom) <= 1 &&
    Math.min(Math.abs(s.caret.left - s.glyph.left), Math.abs(s.caret.left - s.glyph.right)) <= 2
  );
}
