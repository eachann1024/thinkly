import { useRef, useState, useReducer, useLayoutEffect, useId } from "react";
import { useBlockNoteEditor } from "@blocknote/react";
import { FilePanelExtension } from "@blocknote/core/extensions";
import { Button } from "@/components/editor/ui/button";
import { Input } from "@/components/editor/ui/input";
import { Link, Upload } from "@/components/ui/icons";
import { mediaFileAccept, uploadMediaFile } from "../blocks/shared/mediaFilePicker";
import { useEditorPageContext } from "../platform/hostContext";

import { filePanelReducer } from "./filePanelState";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/menus/EditorFilePanel.tsx#messages:1">`
zh-Hans:
  attachmentUploadFailed: "附件上传失败"
  enterAValidHttpOrHttpsUrl: "请输入有效的 http 或 https 链接"
  mediaSource: "媒体来源"
  upload: "上传"
  embedLink: "嵌入链接"
  uploading: "上传中…"
  chooseFile: "选择文件"
  mediaUrl: "媒体链接"
  embed: "嵌入"
en:
  attachmentUploadFailed: "Attachment upload failed"
  enterAValidHttpOrHttpsUrl: "Enter a valid HTTP or HTTPS URL"
  mediaSource: "Media source"
  upload: "Upload"
  embedLink: "Embed link"
  uploading: "Uploading…"
  chooseFile: "Choose file"
  mediaUrl: "Media URL"
  embed: "Embed"
ja:
  attachmentUploadFailed: "添付ファイルのアップロードに失敗しました"
  enterAValidHttpOrHttpsUrl: "有効な http または https の URL を入力してください"
  mediaSource: "メディアのソース"
  upload: "アップロード"
  embedLink: "リンクを埋め込む"
  uploading: "アップロード中…"
  chooseFile: "ファイルを選択"
  mediaUrl: "メディアの URL"
  embed: "埋め込む"
`;
const t = createTranslator(messages);


function remoteMediaUrl(value: string): URL | null {
  try {
    const url = new URL(value.trim());
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    return url;
  } catch { return null; }
}

export function EditorFilePanel({ blockId }: { blockId: string }) {
  useLocale();
  const editor = useBlockNoteEditor<any, any, any>();
  const { page } = useEditorPageContext();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const errorId = useId();
  const [state, dispatch] = useReducer(filePanelReducer, { phase: "idle" });
  const requestRef = useRef(0);
  const loading = state.phase === "uploading";
  const error = state.phase === "error" ? state.message : "";
  useLayoutEffect(() => {
    dispatch({ type: "owner-changed" });
    setUrlInput("");
    return () => { requestRef.current += 1; };
  }, [blockId, editor, page.id]);
  const block = editor.getBlock(blockId);
  const accept = mediaFileAccept(block?.type);
  const close = () => {
    requestRef.current += 1;
    editor.getExtension(FilePanelExtension)?.closeMenu();
    editor.focus();
  };
  const update = (url: string, name: string) => {
    if (!editor.isEditable || editor.getBlock(blockId) !== block) return;
    editor.updateBlock(blockId, { props: { url, name } });
    close();
  };
  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editor.uploadFile || !editor.isEditable) return;
    const request = ++requestRef.current;
    dispatch({ type: "upload-started", request });
    try {
      const updated = await uploadMediaFile(editor, blockId, file, {
        isCurrent: () => requestRef.current === request,
      });
      if (requestRef.current !== request) return;
      dispatch({ type: "upload-completed", request });
      if (updated) close();
    } catch (failure) {
      if (requestRef.current === request) dispatch({ type: "upload-failed", request,
        message: failure instanceof Error ? failure.message : t("attachmentUploadFailed") });
    }
  };
  const embed = (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    const url = remoteMediaUrl(urlInput);
    if (!url) { dispatch({ type: "url-invalid", get message() { return t("enterAValidHttpOrHttpsUrl"); } }); return; }
    let name = "";
    try { name = decodeURIComponent(url.pathname.split("/").pop() || ""); } catch {   }
    update(url.href, name || url.hostname);
  };
  if (!block || !editor.isEditable) return null;
  return (
    <div className="goose-editor-context-ui bn-panel goose-media-source-panel"
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") { event.preventDefault(); close(); }
      }}>
      <div className="goose-media-source-panel__upload">
          <input ref={inputRef} type="file" className="hidden" accept={accept} onChange={upload} />
          <Button type="button" variant="ghost" size="sm" className="goose-media-source-panel__upload-button"
            disabled={loading || !editor.uploadFile} onClick={() => inputRef.current?.click()}>
            <Upload size={18} aria-hidden="true" />{loading ? t("uploading") : t("chooseFile")}
          </Button>
      </div>
      <form noValidate onSubmit={embed} className="goose-media-source-panel__url" aria-label={t("embedLink")}>
          <Link size={18} aria-hidden="true" />
          <Input autoFocus type="url" value={urlInput} placeholder="https://…" aria-label={t("mediaUrl")}
            controlSize="compact" disabled={loading} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault();
            }}
            onChange={(event) => { setUrlInput(event.target.value); dispatch({ type: "form-edited" }); }} />
          <Button type="submit" size="sm" disabled={loading || !urlInput.trim()}>{t("embed")}</Button>
      </form>
      {error && <p id={errorId} role="alert" className="goose-media-source-panel__error">{error}</p>}
    </div>
  );
}
