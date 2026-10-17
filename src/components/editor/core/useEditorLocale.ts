import type { BlockNoteEditor } from "@blocknote/core";
import { useId, useLayoutEffect } from "react";
import { useLocale } from "@/i18n";
import { getEditorPlaceholders, type EditorPlaceholderProfile } from "./editorLocale";

/** Update only presentation: no remount, selection update, or document/history transaction. */
export function useEditorLocale(
  editor: BlockNoteEditor<any, any, any>,
  profile: EditorPlaceholderProfile,
) {
  const locale = useLocale();
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  useLayoutEffect(() => {
    const dom = editor.domElement;
    if (!dom) return;
    const attribute = "data-goose-live-placeholder";
    dom.setAttribute(attribute, id);
    const style = dom.ownerDocument.createElement("style");
    const nonce = editor._tiptapEditor.options.injectNonce;
    if (nonce) style.setAttribute("nonce", nonce);
    const selector = `[${attribute}="${id}"].bn-editor .bn-block-content`;
    const rule = (suffix: string, content: string | undefined) =>
      `${selector}${suffix}:has(.ProseMirror-trailingBreak:only-child):after { content: ${JSON.stringify(content ?? "")}; }`;
    const { default: defaultText, emptyDocument, ...blocks } = getEditorPlaceholders(profile);
    // BlockNote's built-in extension snapshots CSS at mount. Scope overrides to
    // this instance, retaining its original focus/empty-block decoration contract.
    style.textContent = [
      rule("[data-is-empty-and-focused]", defaultText),
      ...(emptyDocument === undefined ? [] : [rule("[data-is-only-empty-block]", emptyDocument)]),
      ...Object.entries(blocks).filter(([, text]) => text !== undefined)
        .map(([type, text]) => rule(`[data-content-type="${type}"]`, text)),
    ].join("\n");
    const root = dom.getRootNode();
    if (root instanceof ShadowRoot) root.appendChild(style);
    else dom.ownerDocument.head.appendChild(style);
    return () => {
      style.remove();
      if (dom.getAttribute(attribute) === id) dom.removeAttribute(attribute);
    };
  }, [editor, id, locale, profile]);
  return locale;
}
