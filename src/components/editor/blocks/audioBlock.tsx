import { useEffect, useState } from "react";
import { createAudioBlockConfig, audioParse } from "@blocknote/core";
import { createReactBlockSpec, useUploadLoading } from "@blocknote/react";
import { EditorAction } from "@/components/editor/ui/button";
import { Download, Music, Upload, X } from "@/components/ui/icons";
import { useEditorPlatform } from "@/components/editor/platform/context";
import { useEditorPageContext } from "@/components/editor/platform/hostContext";
import { MediaLoadingPreview, MediaPlaceholder } from "./shared/MediaPlaceholder";
import { removeMediaBlock, useMediaFilePicker } from "./shared/mediaFilePicker";
import { saveBlobAndReveal } from "@/lib/export/fileSave";
import { toast } from "@/components/ui/sonner";
import { createTranslator, i18nYaml, useLocale } from "@/i18n";

const t = createTranslator(i18nYaml<"src/components/editor/blocks/audioBlock.tsx#block1:1">`
zh-Hans:
  add: "添加音频"
  failed: "无法预览此音频，可下载原文件"
  download: "下载原文件"
  saveFailed: "保存失败"
  replace: "替换音频"
  delete: "删除"
en:
  add: "Add audio"
  failed: "This audio cannot be previewed. Download the original file."
  download: "Download original"
  saveFailed: "Save failed"
  replace: "Replace audio"
  delete: "Delete"
ja:
  add: "音声を追加"
  failed: "この音声は再生できません。元のファイルをダウンロードしてください"
  download: "元のファイルをダウンロード"
  saveFailed: "保存に失敗しました"
  replace: "音声を置き換える"
  delete: "削除"
`);

function AudioContent({ block, editor }: { block: any; editor: any }) {
  useLocale();
  const loading = useUploadLoading(block.id);
  const chooseFile = useMediaFilePicker(editor, block.id);
  const platform = useEditorPlatform();
  const { getActivePageLocalFilePath } = useEditorPageContext();
  const raw = block.props.url as string;
  const pagePath = getActivePageLocalFilePath();
  const [src, setSrc] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let release: (() => void) | undefined;
    setSrc("");
    setFailed(false);
    if (!raw) return;
    if (/^(https?:|data:|blob:)/i.test(raw)) { setSrc(raw); return; }
    const storage = platform.imageStorage;
    const request = storage.acquireVideoRefToUrl
      ? storage.acquireVideoRefToUrl(raw, pagePath)
      : storage.resolveRefToUrl(raw, pagePath).then(url => ({ url, release: () => {} }));
    void request.then(lease => {
      if (cancelled) lease.release();
      else { release = lease.release; setSrc(lease.url); }
    }).catch(() => { if (!cancelled) { setSrc(raw); setFailed(true); } });
    return () => { cancelled = true; release?.(); };
  }, [raw, pagePath, platform.imageStorage]);
  const download = async () => {
    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error("Audio unavailable");
      if (!await saveBlobAndReveal(await response.blob(), block.props.name || "audio")) {
        toast.error(t("saveFailed"));
      }
    } catch { toast.error(t("saveFailed")); }
  };
  if (loading) return <MediaLoadingPreview />;
  if (!raw) return <MediaPlaceholder variant="file" blockId={block.id} editor={editor} title={t("add")} icon={<Music size={18} />} />;
  return (
    <div className="goose-audio-block" contentEditable={false}>
      <div className="goose-audio-block__header">
        <Music size={18} className="goose-audio-block__icon" aria-hidden="true" />
        <span className="goose-audio-block__name" title={block.props.name}>{block.props.name || t("add")}</span>
        <div className="goose-audio-block__actions">
          {editor.isEditable && <EditorAction type="button" className="goose-file-block-action-btn"
            onClick={chooseFile} title={t("replace")} aria-label={t("replace")}>
            <Upload size={18} aria-hidden="true" />
          </EditorAction>}
          <EditorAction type="button" className="goose-file-block-action-btn" disabled={!src}
            onClick={() => void download()} title={t("download")} aria-label={t("download")}>
            <Download size={18} aria-hidden="true" />
          </EditorAction>
          {editor.isEditable && <EditorAction type="button" className="goose-file-block-action-btn goose-media-action--danger"
            onClick={() => removeMediaBlock(editor, block.id)} title={t("delete")} aria-label={t("delete")}>
            <X size={18} aria-hidden="true" />
          </EditorAction>}
        </div>
      </div>
      {block.props.showPreview !== false && !failed && src && <audio key={src} src={src} controls preload="none"
        aria-label={block.props.name || t("add")} className="goose-audio-block__player" onError={() => setFailed(true)} />}
      {failed && <span role="status" className="goose-audio-block__caption">{t("failed")}</span>}
      {block.props.caption && <span className="goose-audio-block__caption">{block.props.caption}</span>}
    </div>
  );
}

export const customAudioBlock = createReactBlockSpec(createAudioBlockConfig({}), {
  meta: { fileBlockAccept: ["audio/*"] },
  render: ({ block, editor }) => <AudioContent block={block} editor={editor} />,
  parse: audioParse({}),
  toExternalHTML: ({ block }) => block.props.url ? <audio src={block.props.url} controls /> : <p />,
})();
