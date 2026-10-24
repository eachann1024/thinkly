import { CellSelection } from "prosemirror-tables";
import {
  inspectPasteContainer,
  resolvePasteLines,
  shouldPreferPlainMultilinePaste,
  shouldSplitMultilinePaste,
  htmlHasRichPasteContent,
} from "../utils/multilinePaste";
import {
  buildSoftWrapPasteInline,
  htmlHasInlineFormatting,
  insertSoftWrappedInline,
  insertSoftWrappedLines,
} from "../utils/softWrapPaste";
import {
  parseMarkdownLink,
  isValidUrl,
  looksLikeMarkdownFragment,
} from "../utils/clipboard";
import {
  cachePasteTarget,
  getCursorBlockType,
  isMultiBlockTextSelection,
  pasteLinesAsBlocks,
  insertPlainInline,
  plainHasGooseMarkdownMarkers,
  tryPasteGooseMarkdownFragment,
  type Editor,
} from "./editorPasteBlocks";

export function handleEditorTextPaste(
  editor: Editor,
  event: React.ClipboardEvent<HTMLDivElement>,
  plainText: string,
  htmlText: string,
) {
  const trimmedText = plainText.trim();

  const pmState = editor.prosemirrorState;
  const container = inspectPasteContainer(pmState.selection.$from);
  if (pmState.selection instanceof CellSelection) {
    container.inTable = true;
  }
  const pasteLines = resolvePasteLines(plainText, htmlText);
  const softWrapText = pasteLines ? pasteLines.join("\n") : plainText;
  if (container.inSoftWrap && softWrapText.includes("\n")) {
    event.preventDefault();
    event.stopPropagation();
    const html = htmlText?.trim() ?? "";
    if (html && htmlHasInlineFormatting(html)) {
      void (async () => {
        let blocks: unknown[];
        try {
          blocks = await editor.tryParseHTMLToBlocks(htmlText);
        } catch {
          blocks = [];
        }
        const inline = buildSoftWrapPasteInline({
          plainText: softWrapText,
          parsedHtmlBlocks: blocks,
        });
        if (inline.length > 0) {
          insertSoftWrappedInline(editor, inline);
          return;
        }
        insertSoftWrappedLines(editor, softWrapText);
      })();
      return;
    }
    const inline = buildSoftWrapPasteInline({
      plainText: softWrapText,
    });
    if (inline.length > 0) {
      insertSoftWrappedInline(editor, inline);
      return;
    }
    insertSoftWrappedLines(editor, softWrapText);
    return;
  }

  if (
    !isMultiBlockTextSelection(editor) &&
    !container.inTable &&
    shouldPreferPlainMultilinePaste(plainText, htmlText)
  ) {
    event.preventDefault();
    event.stopPropagation();
    pasteLinesAsBlocks(
      editor,
      pasteLines!,
      container.listType ?? getCursorBlockType(editor),
    );
    return;
  }

  const mdLink = parseMarkdownLink(trimmedText);
  if (mdLink) {
    event.preventDefault();
    event.stopPropagation();
    editor.createLink(mdLink.url, mdLink.text);
    return;
  }

  if (!/\s/.test(trimmedText) && isValidUrl(trimmedText)) {
    const href = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmedText)
      ? trimmedText
      : `https://${trimmedText}`;
    let selectedText = editor.getSelectedText();
    if (!selectedText?.trim()) {
      try {
        const sel = document.getSelection();
        selectedText = sel?.toString() || "";
      } catch {
      }
    }

    if (selectedText?.trim()) {
      event.preventDefault();
      event.stopPropagation();
      editor.createLink(href, selectedText);
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    editor.createLink(href, trimmedText);
    return;
  }

  const hasMarkdownCodeFence = /(^|\n)\s*```/.test(plainText);
  if (hasMarkdownCodeFence) {
    event.preventDefault();
    event.stopPropagation();
    editor.pasteMarkdown(plainText);
    return;
  }

  if (
    shouldSplitMultilinePaste({
      lines: pasteLines,
      htmlText,
      inSoftWrap: container.inSoftWrap,
      inTable: container.inTable,
      multiBlockSelection: isMultiBlockTextSelection(editor),
    })
  ) {
    event.preventDefault();
    event.stopPropagation();
    pasteLinesAsBlocks(
      editor,
      pasteLines!,
      container.listType ?? getCursorBlockType(editor),
    );
    return;
  }

  if (
    container.listEmpty &&
    !plainText.includes("\n") &&
    !looksLikeMarkdownFragment(plainText) &&
    !htmlHasRichPasteContent(htmlText)
  ) {
    event.preventDefault();
    event.stopPropagation();
    insertPlainInline(editor, plainText);
    return;
  }

  if (!looksLikeMarkdownFragment(plainText)) return;

  if (htmlHasRichPasteContent(htmlText)) return;

  event.preventDefault();
  event.stopPropagation();

  if (plainHasGooseMarkdownMarkers(plainText)) {
    const target = cachePasteTarget(editor);
    if (target && tryPasteGooseMarkdownFragment(editor, plainText, target)) {
      return;
    }
  }

  editor.pasteMarkdown(plainText);
}
