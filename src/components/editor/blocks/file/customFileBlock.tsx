import { Input } from "@/components/editor/ui/input";
import { EditorAction } from "@/components/editor/ui/button";
import * as GooseIcons from "@/components/ui/icons";
import { useCallback, useState } from "react";
import { createFileBlockConfig, fileParse } from "@blocknote/core";
import { createReactBlockSpec, useUploadLoading } from "@blocknote/react";
import { FilePanelExtension } from "@blocknote/core/extensions";
import { toast } from "@/components/ui/sonner";
import { saveBlobAndReveal } from "@/lib/export/fileSave";
import { useEditorPlatform } from "@/components/editor/platform/context";
import {
  useEditorPageContext,
  useEditorSettings,
} from "@/components/editor/platform/hostContext";
import {
  MediaLoadingPreview,
  MediaPlaceholder,
} from "@/components/editor/blocks/shared/MediaPlaceholder";
import messages from "./customFileBlock.messages.yaml";
import { createTranslator, useLocale } from "@/i18n";
const t = createTranslator(messages);


function describeOpenFailure(error: unknown): string {
  const message =
    typeof error === "string"
      ? error.trim()
      : error instanceof Error
        ? error.message.trim()
        : "";
  if (!message || /failed to fetch/i.test(message)) return t("downloadTheFileBeforeOpeningIt");
  return message;
}

function triggerDownload(url: string, name: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function saveOrFallback(blob: Blob, name: string): Promise<void> {
  const saved = await saveBlobAndReveal(blob, name);
  if (saved) {
    toast.success(t("savedToDownloads"));
    return;
  }
  toast.error(t("saveFailed"));
}

function CustomFileBlockContent({
  block,
  editor,
}: {
  block: any;
  editor: any;
}) {
  useLocale();
  const showLoader = useUploadLoading(block.id);
  const platform = useEditorPlatform();
  const { onOpenAttachment } = useEditorPageContext();
  const { features } = useEditorSettings();
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState("");

  const handleAddFile = useCallback(() => {
    if (!editor.isEditable) return;
    const filePanel = editor.getExtension(FilePanelExtension);
    filePanel?.showMenu(block.id);
  }, [editor, block.id]);

  const handleDownload = useCallback(async () => {
    const url = block.props.url;
    const name = block.props.name || "download";
    if (!url) return;

    try {
      if (!/^(?:https?|data|blob):/i.test(url)) {
        const blob = await platform.imageStorage.load(url);
        if (!blob) {
          toast.error(t("theAttachmentIsMissingOrHasNotFinished"));
          return;
        }
        await saveOrFallback(blob, name);
        return;
      }

      const response = await fetch(url);
      await saveOrFallback(await response.blob(), name);
    } catch (error) {
      console.error("[file-block] 保存失败，回退浏览器下载:", error);
      triggerDownload(url, name);
    }
  }, [block.props.url, block.props.name, platform]);

  const handleOpen = useCallback(async () => {
    const url = block.props.url as string;
    const name = (block.props.name as string) || "download";
    if (!url) return;

    if (!features.openAttachmentsExternally || !onOpenAttachment) {
      await handleDownload();
      return;
    }

    try {
      const result = await onOpenAttachment(url, name);
      if (!result.ok) {
        toast.error(t("couldNotOpenInTheDefaultApp"), {
          description: describeOpenFailure(result.error),
        });
      }
    } catch (error) {
      toast.error(t("couldNotOpenInTheDefaultApp"), {
        description: describeOpenFailure(error),
      });
    }
  }, [
    block.props.name,
    block.props.url,
    features.openAttachmentsExternally,
    handleDownload,
    onOpenAttachment,
  ]);

  const handleDelete = useCallback(() => {
    if (!editor.isEditable) return;
    editor.removeBlocks([block]);
  }, [editor, block]);

  const handleRenameStart = useCallback(() => {
    if (!editor.isEditable) return;
    setDraftName(block.props.name || "");
    setRenaming(true);
  }, [block.props.name, editor]);

  const handleRenameCommit = useCallback(() => {
    const trimmed = draftName.trim();
    if (trimmed) {
      editor.updateBlock(block, { props: { name: trimmed } });
    }
    setRenaming(false);
  }, [editor, block, draftName]);

  const handleRenameCancel = useCallback(() => {
    setRenaming(false);
  }, []);

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        e.preventDefault();
        handleRenameCommit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleRenameCancel();
      }
    },
    [handleRenameCommit, handleRenameCancel],
  );

  if (showLoader) {
    return <MediaLoadingPreview />;
  }

  if (!block.props.url) {
    return (
      <MediaPlaceholder
        variant="file"
        blockId={block.id}
        editor={editor}
        title={t("addAttachment")}
        hint={t("clickToChooseOrDragIntoTheEditor")}
        icon={<GooseIcons.FileUp size={18} strokeWidth={1.75} />}
      />
    );
  }

  return (
    <div className="goose-file-block-content">
      <div className="goose-file-block-info">
        {editor.isEditable ? (
          <EditorAction
            type="button"
            className="goose-file-block-icon-btn"
            onClick={handleAddFile}
            title={t("replaceFile")}
          >
            <GooseIcons.FileText size={20} strokeWidth={1.75} />
          </EditorAction>
        ) : (
          <span className="goose-file-block-icon-btn">
            <GooseIcons.FileText size={20} strokeWidth={1.75} />
          </span>
        )}
        {renaming && editor.isEditable ? (
          <Input variant="inline"
            className="goose-file-block-name-input h-auto w-auto"
            value={draftName}
            autoFocus
            onFocus={(e) => e.target.select()}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={handleRenameKeyDown}
            onBlur={handleRenameCommit}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <EditorAction
            type="button"
            className="goose-file-block-name"
            onClick={handleOpen}
            title={t("openInDefaultApp")}
          >
            {block.props.name}
          </EditorAction>
        )}
      </div>
      <div className="goose-editor-inline-context-ui goose-file-block-actions">
        {features.openAttachmentsExternally && (
          <EditorAction
            type="button"
            className="goose-file-block-action-btn"
            onClick={handleOpen}
            title={t("openInDefaultApp")}
          >
            <GooseIcons.ExternalLink size={16} strokeWidth={1.75} />
          </EditorAction>
        )}
        {editor.isEditable ? (
          <EditorAction
            type="button"
            className="goose-file-block-action-btn"
            onClick={handleRenameStart}
            title={t("rename")}
          >
            <GooseIcons.Pencil size={16} strokeWidth={1.75} />
          </EditorAction>
        ) : null}
        <EditorAction
          type="button"
          className="goose-file-block-action-btn"
          onClick={handleDownload}
          title={t("download")}
        >
          <GooseIcons.Download size={16} strokeWidth={1.75} />
        </EditorAction>
        {editor.isEditable ? (
          <EditorAction
            type="button"
            className="goose-file-block-action-btn"
            onClick={handleDelete}
            title={t("delete")}
          >
            <GooseIcons.Trash2 size={16} strokeWidth={1.75} />
          </EditorAction>
        ) : null}
      </div>
    </div>
  );
}

export const customFileBlock = createReactBlockSpec(createFileBlockConfig(), {
  meta: {
    fileBlockAccept: ["*/*"],
  },
  render: (props) => (
    <CustomFileBlockContent block={props.block} editor={props.editor} />
  ),
  parse: fileParse(),
  toExternalHTML: ({ block }) => {
    if (!block.props.url) {
      return <p>{t("addFile")}</p>;
    }

    const link = (
      <a href={block.props.url}>{block.props.name || block.props.url}</a>
    );

    if (block.props.caption) {
      return (
        <div>
          {link}
          <p>{block.props.caption}</p>
        </div>
      );
    }

    return link;
  },
})();
