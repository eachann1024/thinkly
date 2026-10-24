import type { BlockNoteEditor } from "@blocknote/core";
import { FilePanelExtension } from "@blocknote/core/extensions";
import { useCallback, useLayoutEffect } from "react";
import { useEditorPageContext } from "@/components/editor/platform/hostContext";
import { toast } from "@/components/ui/sonner";
import { createTranslator, i18nYaml } from "@/i18n";

const t = createTranslator(i18nYaml<"src/components/editor/blocks/shared/mediaFilePicker.ts#block1:1">`
zh-Hans:
  failed: "附件上传失败"
  unavailable: "当前无法上传附件，请稍后重试"
en:
  failed: "Attachment upload failed"
  unavailable: "Attachment upload is unavailable. Try again later."
ja:
  failed: "添付ファイルのアップロードに失敗しました"
  unavailable: "現在添付ファイルをアップロードできません。後でもう一度お試しください"
`);

export type MediaFileEditor = BlockNoteEditor<any, any, any>;
const mediaTypes = new Set(["image", "imageResize", "video", "audio", "file"]);
const requests = new WeakMap<MediaFileEditor, Map<string, object>>();
const pickers = new WeakMap<MediaFileEditor, { blockId: string; cancel: () => void }>();

export function mediaFileAccept(type?: string): string | undefined {
  return type === "image" || type === "imageResize" ? "image/*" : type === "video" ? "video/*"
    : type === "audio" ? "audio/*" : undefined;
}

/** A later upload, conversion, removal or page replacement invalidates the owner. */
export async function uploadMediaFile(editor: MediaFileEditor, blockId: string, file: File,
  { isCurrent = () => true }: { isCurrent?: () => boolean } = {}): Promise<boolean> {
  const active = () => editor.isEditable && !editor.prosemirrorView.isDestroyed && isCurrent();
  if (!active()) return false;
  const before = editor.getBlock(blockId);
  if (!before || !mediaTypes.has(before.type)) return false;
  if (!editor.uploadFile) throw new Error(t("unavailable"));
  const owner = { type: before.type, url: before.props.url, name: before.props.name };
  const token = {};
  let pending = requests.get(editor);
  if (!pending) { pending = new Map(); requests.set(editor, pending); }
  pending.set(blockId, token);
  try {
    const result = await editor.uploadFile(file, blockId);
    if (!active() || pending.get(blockId) !== token) return false;
    const current = editor.getBlock(blockId);
    if (current !== before
      || current.type !== owner.type || current.props.url !== owner.url || current.props.name !== owner.name) return false;
    const url = typeof result === "string" ? result : result?.props?.url ?? result?.url;
    if (typeof url !== "string" || !url.trim()) throw new Error(t("failed"));
    editor.updateBlock(blockId, { props: { url, name: file.name } });
    return true;
  } catch (failure) {
    if (!active() || pending.get(blockId) !== token || editor.getBlock(blockId) !== before) return false;
    throw failure;
  } finally {
    if (pending.get(blockId) === token) pending.delete(blockId);
  }
}

function cancelMediaFilePicker(editor: MediaFileEditor, blockId?: string): void {
  const active = pickers.get(editor);
  if (active && (!blockId || active.blockId === blockId)) active.cancel();
}

/** One short-lived native input per editor, allocated only by a user action. */
export function openMediaFilePicker(editor: MediaFileEditor, blockId: string): () => void {
  cancelMediaFilePicker(editor);
  const before = editor.getBlock(blockId);
  if (!before || !mediaTypes.has(before.type) || !editor.isEditable) return () => {};
  if (!editor.uploadFile) { toast.error(t("unavailable")); return () => {}; }
  const document = editor.prosemirrorView.dom.ownerDocument;
  const window = document.defaultView;
  if (!window || window.navigator.userActivation?.isActive === false) return () => {};
  editor.getExtension(FilePanelExtension)?.closeMenu();
  const input = document.createElement("input");
  input.type = "file";
  input.accept = mediaFileAccept(before.type) || "";
  input.hidden = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let unsubscribe: (() => void) | undefined;
  const cancel = () => {
    input.remove();
    input.removeEventListener("change", choose);
    input.removeEventListener("cancel", cancel);
    window.removeEventListener("focus", returned);
    window.removeEventListener("pagehide", cancel);
    if (timer) clearTimeout(timer);
    unsubscribe?.();
    if (pickers.get(editor)?.cancel === cancel) pickers.delete(editor);
  };
  const returned = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(cancel, 300);
  };
  const choose = () => {
    const file = input.files?.[0];
    cancel();
    if (!file || editor.getBlock(blockId) !== before) return;
    void uploadMediaFile(editor, blockId, file).then(updated => {
      if (updated) editor.focus();
    }).catch(failure => toast.error(failure instanceof Error ? failure.message : t("failed")));
  };
  pickers.set(editor, { blockId, cancel });
  input.addEventListener("change", choose);
  input.addEventListener("cancel", cancel);
  window.addEventListener("focus", returned);
  window.addEventListener("pagehide", cancel);
  unsubscribe = editor.onChange(() => {
    if (!editor.isEditable || editor.getBlock(blockId) !== before) cancel();
  });
  document.body.appendChild(input);
  try { input.click(); } catch { cancel(); toast.error(t("unavailable")); }
  return cancel;
}

/** Leaving a block/page clears its chooser; submitted uploads keep their owner guard. */
export function useMediaFilePicker(editor: MediaFileEditor, blockId: string): () => void {
  const { page } = useEditorPageContext();
  useLayoutEffect(() => () => cancelMediaFilePicker(editor, blockId), [editor, blockId, page.id]);
  return useCallback(() => { openMediaFilePicker(editor, blockId); }, [editor, blockId]);
}

export function removeMediaBlock(editor: MediaFileEditor, blockId: string): void {
  if (!editor.isEditable || !editor.getBlock(blockId)) return;
  cancelMediaFilePicker(editor, blockId);
  requests.get(editor)?.delete(blockId);
  editor.removeBlocks([blockId]);
  editor.focus();
}
