import { EditorAction } from "@/components/editor/ui/button";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Download,
  RefreshCw,
  Trash2,
} from "@/components/ui/icons";
import type { MouseEventHandler, ReactNode } from "react";
import { useCallback, useEffect } from "react";
import { flip, offset, shift, size, useFloating } from "@floating-ui/react";
import { cn } from "@/components/editor/utils/cn";
import type { ImageAlignment } from "@/components/editor/image/imageUtils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/editor/ui/tooltip";
import {
  EDITOR_CONTEXT_UI_GAP,
  getScaledEditorUiPx,
} from "@/components/editor/utils/editorContextUi";
import { useEditorUiScale } from "@/components/editor/hooks/useEditorUiScale";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/blocks/video/VideoToolbar.tsx#messages:1">`
zh-Hans:
  videoActions: "视频操作"
  alignLeft: "左对齐"
  alignCenter: "居中对齐"
  alignRight: "右对齐"
  replaceVideo: "更换视频"
  downloadVideo: "下载视频"
  deleteVideo: "删除视频"
en:
  videoActions: "Video actions"
  alignLeft: "Align left"
  alignCenter: "Align center"
  alignRight: "Align right"
  replaceVideo: "Replace video"
  downloadVideo: "Download video"
  deleteVideo: "Delete video"
ja:
  videoActions: "ビデオの操作"
  alignLeft: "左揃え"
  alignCenter: "中央揃え"
  alignRight: "右揃え"
  replaceVideo: "ビデオを置き換え"
  downloadVideo: "ビデオをダウンロード"
  deleteVideo: "ビデオを削除"
`;
const t = createTranslator(messages);


type VideoToolbarProps = {
  rect: DOMRect;
  alignment: ImageAlignment;
  editable: boolean;
  onAlign: (alignment: ImageAlignment) => void;
  onReplace: () => void;
  onDownload: () => void;
  onDelete: () => void;
};

const toolButtonClass = "goose-block-toolbar-control";

function VideoToolButton({
  label,
  className,
  pressed,
  tooltipSideOffset,
  onClick,
  children,
}: {
  label: string;
  className?: string;
  pressed?: boolean;
  tooltipSideOffset: number;
  onClick: MouseEventHandler<HTMLButtonElement>;
  children: ReactNode;
}) {
  useLocale();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <EditorAction
          type="button"
          aria-label={label}
          aria-pressed={pressed}
          onClick={onClick}
          className={cn(toolButtonClass, className)}
        >
          {children}
        </EditorAction>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={tooltipSideOffset}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function VideoToolbar({
  rect,
  alignment,
  editable,
  onAlign,
  onReplace,
  onDownload,
  onDelete,
}: VideoToolbarProps) {
  useLocale();
  const editorUiScale = useEditorUiScale();
  const overflowPadding = getScaledEditorUiPx(8, editorUiScale);
  const { refs, floatingStyles, update } = useFloating({
    strategy: "fixed",
    placement: "top",
    middleware: [
      offset(getScaledEditorUiPx(EDITOR_CONTEXT_UI_GAP, editorUiScale)),
      flip({ padding: overflowPadding, fallbackPlacements: ["bottom"] }),
      shift({ padding: overflowPadding }),
      size({
        padding: overflowPadding,
        apply({ availableWidth, elements }) {
          elements.floating.style.maxWidth = `${Math.max(0, availableWidth)}px`;
          elements.floating.style.overflowX = "auto";
        },
      }),
    ],
  });
  const setFloating = useCallback(
    (node: HTMLElement | null) => refs.setFloating(node),
    [refs],
  );

  useEffect(() => {
    refs.setPositionReference({
      getBoundingClientRect: () => rect,
    });
    void update();
  }, [rect, refs, update, editorUiScale]);

  return (
    <TooltipProvider delayDuration={400} skipDelayDuration={100}>
      <div
        data-goose-video-toolbar
        ref={setFloating}
        className="fixed z-[20000]"
        style={floatingStyles}
        onMouseDown={(event) => event.preventDefault()}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        role="toolbar"
        aria-label={t("videoActions")}
      >
        <div className="goose-editor-context-ui goose-block-toolbar-surface animate-in fade-in-0 zoom-in-95 duration-150">
          {editable &&
            (
              [
                ["left", t("alignLeft"), AlignLeft],
                ["center", t("alignCenter"), AlignCenter],
                ["right", t("alignRight"), AlignRight],
              ] as const
            ).map(([value, label, Icon]) => (
              <VideoToolButton
                key={value}
                label={label}
                pressed={alignment === value}
                tooltipSideOffset={getScaledEditorUiPx(8, editorUiScale)}
                onClick={() => onAlign(value)}
              >
                <Icon className="h-[15px] w-[15px]" />
              </VideoToolButton>
            ))}

          {editable && <div className="goose-block-toolbar-separator" />}

          {editable && (
            <VideoToolButton
              label={t("replaceVideo")}
              tooltipSideOffset={getScaledEditorUiPx(8, editorUiScale)}
              onClick={onReplace}
            >
              <RefreshCw className="h-[15px] w-[15px]" />
            </VideoToolButton>
          )}
          <VideoToolButton
            label={t("downloadVideo")}
            tooltipSideOffset={getScaledEditorUiPx(8, editorUiScale)}
            onClick={onDownload}
          >
            <Download className="h-[15px] w-[15px]" />
          </VideoToolButton>
          {editable && (
            <VideoToolButton
              label={t("deleteVideo")}
              tooltipSideOffset={getScaledEditorUiPx(8, editorUiScale)}
              onClick={onDelete}
              className="hover:bg-destructive/10 hover:text-danger focus-visible:bg-destructive/10 focus-visible:text-danger"
            >
              <Trash2 className="h-[15px] w-[15px]" />
            </VideoToolButton>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
