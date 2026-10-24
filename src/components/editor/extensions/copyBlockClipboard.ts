import { Slice } from "prosemirror-model";
import { NodeSelection, TextSelection, type EditorState } from "prosemirror-state";
import type { EditorView } from "@tiptap/pm/view";
import { CellSelection } from "prosemirror-tables";
import { toast } from "@/components/ui/sonner";
import { isGeneratedDataImageName } from "../blocks/image/imageCaption";
import { serializeDocRangePlainText, serializeSlicePlainText } from "../utils/clipboard";
import { getSelectedCellPlainText, isWholeTableCellSelection } from "../utils/selection";
import { resolveCopyBlockSelection, getTableBlockContainerSelection } from "./copyBlockSelection";
import { deleteSelectionSafely } from "./selectionDelete";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/components/editor/extensions/copyBlockClipboard.ts#messages:1">`
zh-Hans:
  couldNotWriteToTheClipboardYourOriginal: "无法写入剪贴板，原内容已保留"
en:
  couldNotWriteToTheClipboardYourOriginal: "Could not write to the clipboard. Your original content was preserved."
ja:
  couldNotWriteToTheClipboardYourOriginal: "クリップボードに書き込めませんでした。元の内容は残されています"
`;
const t = createTranslator(messages);


export const GOOSE_BLOCKNOTE_BLOCK_COPY_MIME = "application/x-goose-blocknote-block";

function normalizeDataImageCaptionInClipboardDom(dom: HTMLElement): void {
  for (const image of dom.querySelectorAll<HTMLElement>('[data-content-type="image"]')) {
    if (image.getAttribute("data-caption-source") !== "generated") continue;
    const url = image.getAttribute("data-url");
    const caption = image.getAttribute("data-caption");
    if (!isGeneratedDataImageName(caption, url)) continue;
    if (!image.getAttribute("data-name")) image.setAttribute("data-name", caption!.trim());
    image.removeAttribute("data-caption");
  }
}

export function normalizeBlockNoteClipboardHtml(html: string): string {
  if (!html || typeof DOMParser === "undefined") return html;
  const document = new DOMParser().parseFromString(html, "text/html");
  const before = document.body.innerHTML;
  normalizeDataImageCaptionInClipboardDom(document.body);
  return document.body.innerHTML === before ? html : document.body.innerHTML;
}

function copySelectionPlainText(state: EditorState, selection: NodeSelection | Slice): string {
  const cells = getSelectedCellPlainText(state);
  if (cells !== null && !isWholeTableCellSelection(state)) return cells;
  if (state.selection instanceof TextSelection && !state.selection.empty) {
    return serializeDocRangePlainText(state.doc, state.selection.from, state.selection.to, { preserveWhitespace: true });
  }
  return selection instanceof NodeSelection
    ? serializeDocRangePlainText(state.doc, selection.from, selection.to, { includeBlockMarkers: true })
    : serializeSlicePlainText(selection, { includeBlockMarkers: true });
}

export function getSelectionClipboardPayload(view: EditorView): { html: string; plain: string } | null {
  const selection = resolveCopyBlockSelection(view.state);
  if (!selection) return null;
  const slice = selection instanceof NodeSelection ? selection.content() : selection;
  if (slice.size === 0) return null;
  const { dom } = view.serializeForClipboard(slice);
  normalizeDataImageCaptionInClipboardDom(dom);
  return { html: dom.innerHTML, plain: copySelectionPlainText(view.state, selection) };
}

export function writeClipboardPayload(
  clipboard: DataTransfer,
  payload: { html: string; plain: string },
): void {
  clipboard.clearData();
  clipboard.setData("blocknote/html", payload.html);
  clipboard.setData("text/html", payload.html);
  clipboard.setData("text/plain", payload.plain);
  clipboard.setData(GOOSE_BLOCKNOTE_BLOCK_COPY_MIME, "1");
}

export function writeSelectionClipboard(view: EditorView, event: ClipboardEvent): boolean {
  if (event.defaultPrevented || !event.clipboardData) return false;
  try {
    const payload = getSelectionClipboardPayload(view);
    if (!payload) return false;
    event.preventDefault();
    writeClipboardPayload(event.clipboardData, payload);
    return true;
  } catch (error) {
    event.preventDefault();
    console.error("[editor] Failed to write selection clipboard", error);
    toast.error(t("couldNotWriteToTheClipboardYourOriginal"));
    return false;
  }
}

export function deleteCutSelection(view: EditorView): void {
  if (!view.editable || view.state.selection.empty) return;
  if (view.state.selection instanceof CellSelection && isWholeTableCellSelection(view.state)) {
    const table = getTableBlockContainerSelection(view.state);
    if (table) view.dispatch(view.state.tr.setSelection(table));
  }
  deleteSelectionSafely(view);
}
