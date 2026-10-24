import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createReactBlockSpec, useUploadLoading } from "@blocknote/react";
import {
  createVideoBlockConfig,
  videoParse,
  type BlockNoteEditor,
} from "@blocknote/core";
import { useMediaFilePicker } from "../shared/mediaFilePicker";
import * as GooseIcons from "@/components/ui/icons";
import { GooseVideoPlayer } from "./GooseVideoPlayer";
import { VideoToolbar } from "./VideoToolbar";
import { useBlockToolbarState } from "../../core/blockToolbarSequence";
import { ownsBlockToolbar } from "../../core/blockToolbarOwner";
import {
  MediaLoadingPreview,
  MediaPlaceholder,
} from "@/components/editor/blocks/shared/MediaPlaceholder";
import { useEditorPlatform } from "@/components/editor/platform/context";
import { useEditorPageContext } from "@/components/editor/platform/hostContext";
import type { ImageAlignment } from "@/components/editor/image/imageUtils";
import { EDITOR_UI_SCALE_CHANGE_EVENT } from "@/lib/appearance";
import { saveBlobAndReveal } from "@/lib/export/fileSave";
import { toast } from "@/components/ui/sonner";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/blocks/video/videoBlock.tsx#messages:1">`
zh-Hans:
  savedToDownloads: "已保存到下载文件夹"
  saveFailed: "保存失败"
  processingVideo: "视频处理中…"
  addVideo: "添加视频"
  chooseALocalVideoToAutomaticallyCompressIt: "选择本地视频"
  loadingVideo: "视频加载中…"
en:
  savedToDownloads: "Saved to Downloads"
  saveFailed: "Save failed"
  processingVideo: "Processing video…"
  addVideo: "Add video"
  chooseALocalVideoToAutomaticallyCompressIt: "Choose a local video"
  loadingVideo: "Loading video…"
ja:
  savedToDownloads: "ダウンロードフォルダに保存しました"
  saveFailed: "保存に失敗しました"
  processingVideo: "ビデオを処理中…"
  addVideo: "ビデオを追加"
  chooseALocalVideoToAutomaticallyCompressIt: "ローカルのビデオを選択"
  loadingVideo: "ビデオを読み込み中…"
`;
const t = createTranslator(messages);



function ensureParagraphAfter(
  editor: BlockNoteEditor<any, any, any>,
  block: { id: string },
) {
  try {
    const [inserted] = editor.insertBlocks(
      [{ type: "paragraph", content: "" }],
      block,
      "after",
    );
    if (inserted) {
      editor.setTextCursorPosition(inserted, "start");
      editor.focus();
    }
  } catch {
  }
}

function VideoBlockContent({
  block,
  editor,
}: {
  block: any;
  editor: BlockNoteEditor<any, any, any>;
}) {
  useLocale();
  const showLoader = useUploadLoading(block.id);
  const handleReplace = useMediaFilePicker(editor, block.id);
  const shellRef = useRef<HTMLDivElement>(null);
  const platform = useEditorPlatform();
  const { getActivePageLocalFilePath } = useEditorPageContext();
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [selected, setSelected] = useState(false);
  const toolbarState = useBlockToolbarState(editor, block.id);
  const showToolbar = !toolbarState.suppressed && (selected || toolbarState.ready);
  const [toolbarRect, setToolbarRect] = useState<DOMRect | null>(null);

  const rawSrc = block.props.url as string;
  const activePageLocalFilePath = getActivePageLocalFilePath();
  const alignment: ImageAlignment =
    block.props.textAlignment === "center" ||
    block.props.textAlignment === "right"
      ? block.props.textAlignment
      : "left";

  useEffect(() => {
    let cancelled = false;
    let release: (() => void) | undefined;
    setResolvedSrc(null);

    if (!rawSrc) return () => undefined;
    if (/^(?:https?:|data:|blob:)/i.test(rawSrc)) {
      setResolvedSrc(rawSrc);
      return () => undefined;
    }

    const storage = platform.imageStorage;
    const request = storage.acquireVideoRefToUrl
      ? storage.acquireVideoRefToUrl(rawSrc, activePageLocalFilePath)
      : storage.resolveRefToUrl(rawSrc, activePageLocalFilePath)
        .then(url => ({ url, release: () => {} }));
    void request.then((lease) => {
        if (cancelled) lease.release();
        else {
          release = lease.release;
          setResolvedSrc(lease.url);
        }
      })
      .catch((error) => {
        console.error("[video] 视频资源解析失败:", rawSrc, error);
        if (!cancelled) setResolvedSrc(rawSrc);
      });

    return () => {
      cancelled = true;
      release?.();
    };
  }, [activePageLocalFilePath, platform.imageStorage, rawSrc]);

  const updateToolbarRect = useCallback(() => {
    const shell = shellRef.current;
    if (shell) setToolbarRect(shell.getBoundingClientRect());
  }, []);

  useEffect(() => {
    if (!showToolbar) return;
    updateToolbarRect();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (ownsBlockToolbar(target?.closest<HTMLElement>("[data-goose-video-toolbar]") ?? null, editor.prosemirrorView.dom, block.id)) {
        setSelected(true);
        return;
      }
      if (
        target &&
        shellRef.current?.contains(target)
      ) {
        return;
      }
      setSelected(false);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("scroll", updateToolbarRect, true);
    window.addEventListener("resize", updateToolbarRect);
    window.addEventListener(EDITOR_UI_SCALE_CHANGE_EVENT, updateToolbarRect);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("scroll", updateToolbarRect, true);
      window.removeEventListener("resize", updateToolbarRect);
      window.removeEventListener(
        EDITOR_UI_SCALE_CHANGE_EVENT,
        updateToolbarRect,
      );
    };
  }, [editor, block.id, showToolbar, updateToolbarRect]);

  const handleEnterBelow = useCallback(() => {
    if (editor.isEditable) ensureParagraphAfter(editor, block);
  }, [block, editor]);

  const handleDownload = useCallback(async () => {
    if (!resolvedSrc) return;
    const name = block.props.name || `video-${Date.now()}.mp4`;
    try {
      const response = await fetch(resolvedSrc);
      if (!response.ok) { toast.error(t("saveFailed")); return; }
      const saved = await saveBlobAndReveal(await response.blob(), name);
      if (saved) toast.success(t("savedToDownloads"));
      else toast.error(t("saveFailed"));
    } catch (error) {
      console.error("[video] 保存失败:", error);
      toast.error(t("saveFailed"));
    }
  }, [block.props.name, resolvedSrc]);

  const handleDelete = useCallback(() => {
    editor.removeBlocks([block]);
  }, [block, editor]);

  const handleAlign = useCallback(
    (value: ImageAlignment) => {
      editor.updateBlock(block, { props: { textAlignment: value } });
    },
    [block, editor],
  );

  if (showLoader) {
    return <MediaLoadingPreview label={t("processingVideo")} />;
  }

  if (!block.props.url) {
    return (
      <MediaPlaceholder
        variant="image"
        blockId={block.id}
        editor={editor}
        title={t("addVideo")}
        hint={t("chooseALocalVideoToAutomaticallyCompressIt")}
        icon={<GooseIcons.Video size={22} strokeWidth={1.75} />}
      />
    );
  }

  if (!resolvedSrc) {
    return <MediaLoadingPreview label={t("loadingVideo")} />;
  }

  return (
    <div
      ref={shellRef}
      className="goose-video-block-shell"
      data-selected={selected ? "true" : "false"}
      data-alignment={alignment}
      style={
        block.props.previewWidth
          ? { width: `min(${block.props.previewWidth}px, 100%)` }
          : undefined
      }
      onPointerDownCapture={() => {
        setSelected(true);
        window.requestAnimationFrame(updateToolbarRect);
      }}
    >
      <GooseVideoPlayer src={resolvedSrc} onEnterBelow={handleEnterBelow} onDownload={handleDownload} />
      {showToolbar &&
        toolbarRect &&
        editor.isEditable &&
        createPortal(
          <VideoToolbar
            blockId={block.id}
            editorRoot={editor.prosemirrorView.dom}
            rect={toolbarRect}
            alignment={alignment}
            editable={editor.isEditable}
            onAlign={handleAlign}
            onReplace={handleReplace}
            onDownload={handleDownload}
            onDelete={handleDelete}
          />,
          document.body,
        )}
    </div>
  );
}

export const customVideoBlock = createReactBlockSpec(
  createVideoBlockConfig({}),
  {
    meta: {
      fileBlockAccept: [
        "video/mp4",
        "video/quicktime",
        "video/webm",
        "video/x-m4v",
        "video/x-msvideo",
        "video/x-matroska",
        "video/*",
      ],
    },
    render: ({ block, editor }) => (
      <VideoBlockContent block={block} editor={editor} />
    ),
    parse: videoParse({}),
    toExternalHTML: ({ block }) => {
      if (!block.props.url) {
        return <p></p>;
      }
      return (
        <video
          src={block.props.url}
          controls
          className="bn-visual-media rounded-md max-w-full"
        />
      );
    },
  },
)();
