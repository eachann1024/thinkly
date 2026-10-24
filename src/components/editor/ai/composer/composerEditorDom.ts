
export function scrollComposerCaretIntoView(editor: HTMLElement): void {
  if (editor.scrollHeight <= editor.clientHeight + 1) return;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    editor.scrollTop = editor.scrollHeight;
    return;
  }

  const range = selection.getRangeAt(0);
  if (
    editor !== range.commonAncestorContainer &&
    !editor.contains(range.commonAncestorContainer)
  ) {
    return;
  }

  let caretTop: number | null = null;
  let caretBottom: number | null = null;

  const acceptRect = (rect: DOMRect | ClientRect): boolean => {
    if (
      rect.width === 0 &&
      rect.height === 0 &&
      rect.top === 0 &&
      rect.left === 0
    ) {
      return false;
    }
    caretTop = rect.top;
    caretBottom = rect.bottom;
    return true;
  };

  const rects = range.getClientRects();
  if (rects.length > 0) {
    acceptRect(rects[rects.length - 1]!);
  }
  if (caretTop === null) {
    acceptRect(range.getBoundingClientRect());
  }

  if (caretTop === null) {
    const marker = document.createElement("span");
    marker.textContent = "\u200b";
    marker.style.cssText =
      "display:inline-block;width:0;height:1em;padding:0;margin:0;border:0;overflow:hidden;vertical-align:baseline;";

    const probe = range.cloneRange();
    probe.collapse(true);
    probe.insertNode(marker);
    acceptRect(marker.getBoundingClientRect());
    const parent = marker.parentNode;
    parent?.removeChild(marker);
    try {
      parent?.normalize();
      selection.removeAllRanges();
      selection.addRange(range);
    } catch {
    }
  }

  if (caretTop === null || caretBottom === null) {
    editor.scrollTop = editor.scrollHeight;
    return;
  }

  const editorRect = editor.getBoundingClientRect();
  const overflowBottom = caretBottom - editorRect.bottom;
  const overflowTop = editorRect.top - caretTop;

  if (overflowBottom > 0) {
    editor.scrollTop += overflowBottom;
  } else if (overflowTop > 0) {
    editor.scrollTop -= overflowTop;
  }
}

export function insertComposerLineBreak(editor: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!selection) return false;

  const selectionInsideEditor =
    selection.rangeCount > 0 &&
    (editor === selection.anchorNode ||
      editor.contains(selection.anchorNode));

  if (!selectionInsideEditor) {
    editor.focus({ preventScroll: true });
    const endRange = document.createRange();
    endRange.selectNodeContents(editor);
    endRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(endRange);
  }

  const finish = (ok: boolean): boolean => {
    if (ok) {
      scrollComposerCaretIntoView(editor);
      requestAnimationFrame(() => {
        scrollComposerCaretIntoView(editor);
      });
    }
    return ok;
  };

  try {
    if (document.execCommand("insertLineBreak")) return finish(true);
  } catch {
  }

  try {
    if (document.execCommand("insertText", false, "\n")) return finish(true);
  } catch {
  }

  if (!selection.rangeCount) return false;
  const range = selection.getRangeAt(0);
  if (
    editor !== range.commonAncestorContainer &&
    !editor.contains(range.commonAncestorContainer)
  ) {
    return false;
  }

  range.deleteContents();
  const br = document.createElement("br");
  range.insertNode(br);

  if (!br.nextSibling) {
    const anchor = document.createElement("br");
    br.parentNode?.insertBefore(anchor, br.nextSibling);
  }

  const nextRange = document.createRange();
  nextRange.setStartAfter(br);
  nextRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(nextRange);
  return finish(true);
}
