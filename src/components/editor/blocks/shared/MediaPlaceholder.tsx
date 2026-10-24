import { EditorAction } from "@/components/editor/ui/button";
import * as GooseIcons from "@/components/ui/icons";
import { useCallback, type ReactNode } from "react";
import { FilePanelExtension } from "@blocknote/core/extensions";
import { cn } from "@/components/editor/utils/cn";
import { removeMediaBlock, useMediaFilePicker, type MediaFileEditor } from "./mediaFilePicker";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/blocks/shared/MediaPlaceholder.tsx#messages:1">`
zh-Hans:
  uploading: "上传中…"
  embed: "嵌入链接"
  delete: "删除"
en:
  uploading: "Uploading…"
  embed: "Embed link"
  delete: "Delete"
ja:
  uploading: "アップロード中…"
  embed: "リンクを埋め込む"
  delete: "削除"
`;
const t = createTranslator(messages);


export type MediaPlaceholderVariant = "image" | "file";

type MediaPlaceholderProps = {
  variant: MediaPlaceholderVariant;
  blockId: string;
  editor: MediaFileEditor;
  title: string;
  hint?: string;
  icon: ReactNode;
  className?: string;
};

export function MediaPlaceholder({
  variant,
  blockId,
  editor,
  title,
  hint,
  icon,
  className,
}: MediaPlaceholderProps) {
  useLocale();
  const chooseFile = useMediaFilePicker(editor, blockId);
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
  }, []);

  const embedLink = useCallback(() => {
    if (!editor.isEditable) return;
    editor.getExtension(FilePanelExtension)?.showMenu(blockId);
  }, [blockId, editor]);

  const isImage = variant === "image";

  return (
    <div contentEditable={false}
      className={cn(
        "goose-media-placeholder",
        isImage
          ? "goose-media-placeholder--image"
          : "goose-media-placeholder--file",
        className,
      )}
    >
      <EditorAction type="button" className="goose-media-placeholder__choose"
        onMouseDown={handleMouseDown} onClick={chooseFile} disabled={!editor.isEditable}
        aria-label={title} title={hint || title}>
        <span className="goose-media-placeholder__icon" aria-hidden="true">{icon}</span>
        <span className="goose-media-placeholder__copy">
          <span className="goose-media-placeholder__title">{title}</span>
        </span>
      </EditorAction>
      {editor.isEditable && <div className="goose-media-placeholder__actions">
        <EditorAction type="button" className="goose-media-placeholder__action"
          onMouseDown={handleMouseDown} onClick={embedLink} aria-label={t("embed")} title={t("embed")}>
          <GooseIcons.Link size={18} aria-hidden="true" />
        </EditorAction>
        <EditorAction type="button" className="goose-media-placeholder__action goose-media-action--danger"
          onMouseDown={handleMouseDown} onClick={() => removeMediaBlock(editor, blockId)}
          aria-label={t("delete")} title={t("delete")}>
          <GooseIcons.X size={18} aria-hidden="true" />
        </EditorAction>
      </div>}
    </div>
  );
}

export function MediaLoadingPreview({ label = t("uploading") }: { label?: string }) {
  useLocale();
  return (
    <div className="goose-media-loading" role="status" aria-live="polite">
      <GooseIcons.Loader2
        className="goose-media-loading__spinner"
        size={18}
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <span className="goose-media-loading__label">{label}</span>
    </div>
  );
}
