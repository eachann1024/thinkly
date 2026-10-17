import { EditorAction } from "@/components/editor/ui/button";
import type { BlockNoteEditor } from "@blocknote/core";
import { ImageEditControls } from "./ImageEditControls";
import { SelectionToolbarSurface } from "@/components/editor/toolbars/SelectionToolbarSurface";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Copy,
  Download,
  Maximize2,
} from "@/components/ui/icons";
import { useEffect, type MouseEventHandler, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useFloating,
} from "@floating-ui/react";
import { cn } from "@/components/editor/utils/cn";
import type { ImageAlignment } from "@/components/editor/image/imageUtils";
import { EDITOR_UI_SCALE_CHANGE_EVENT } from "@/lib/appearance";
import {
  EDITOR_CONTEXT_UI_GAP,
  getScaledEditorUiPx,
} from "@/components/editor/utils/editorContextUi";
import { useEditorUiScale } from "@/components/editor/hooks/useEditorUiScale";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/editor/ui/tooltip";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/image/ImageToolbar.tsx#messages:1">`
zh-Hans:
  imageActions: "图片操作"
  alignLeft: "左对齐"
  alignCenter: "居中对齐"
  alignRight: "右对齐"
  copyImage: "复制图片"
  downloadImage: "下载图片"
en:
  imageActions: "Image actions"
  alignLeft: "Align left"
  alignCenter: "Align center"
  alignRight: "Align right"
  copyImage: "Copy image"
  downloadImage: "Download image"
`;
const t = createTranslator(messages);


export interface SelectedImageState {
  blockId: string | null;
  src: string;
  alt?: string;
  index: number;
  rect: DOMRect;
  alignment: ImageAlignment;
}

interface ImageToolbarProps {
  editor: BlockNoteEditor<any, any, any>;
  selectedImage: SelectedImageState;
  applyImageAlignment: (alignment: ImageAlignment) => void;
  handleSelectedImageZoom: () => void;
  handleSelectedImageSystemPreview?: () => void;
  handleSelectedImageCopy: () => void;
  handleSelectedImageDownload: () => void;
  openImageLabel: string;
  floatingBoundary?: HTMLElement | null;
  getReferenceRect?: () => DOMRect | null;
}

const imageToolButtonClass = "goose-block-toolbar-control";

function ImageToolButton({
  label,
  className,
  pressed,
  onClick,
  onContextMenu,
  tooltipSideOffset,
  children,
}: {
  label: string;
  className?: string;
  pressed?: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
  onContextMenu?: MouseEventHandler<HTMLButtonElement>;
  tooltipSideOffset: number;
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
          onContextMenu={onContextMenu}
          className={cn(imageToolButtonClass, className)}
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

export function ImageToolbar({
  editor,
  selectedImage,
  applyImageAlignment,
  handleSelectedImageZoom,
  handleSelectedImageSystemPreview,
  handleSelectedImageCopy,
  handleSelectedImageDownload,
  openImageLabel,
  floatingBoundary,
  getReferenceRect,
}: ImageToolbarProps) {
  useLocale();
  const editorUiScale = useEditorUiScale();
  const usesFloatingPosition = Boolean(getReferenceRect);
  const overflowOptions = {
    boundary: floatingBoundary ?? undefined,
    padding: getScaledEditorUiPx(8, editorUiScale),
  };
  const { refs, floatingStyles, update } = useFloating({
    open: usesFloatingPosition,
    strategy: "fixed",
    placement: "top",
    middleware: [
      offset(() => getScaledEditorUiPx(EDITOR_CONTEXT_UI_GAP)),
      flip({ ...overflowOptions, fallbackPlacements: ["bottom"] }),
      shift(overflowOptions),
      size({
        ...overflowOptions,
        apply({ availableWidth, elements }) {
          elements.floating.style.maxWidth = `${Math.max(0, availableWidth)}px`;
          elements.floating.style.overflowX = "auto";
        },
      }),
    ],
    whileElementsMounted(reference, floating, update) {
      return autoUpdate(reference, floating, update, {
        animationFrame: true,
      });
    },
  });

  useEffect(() => {
    if (!getReferenceRect) return;
    refs.setPositionReference({
      getBoundingClientRect: () => getReferenceRect() ?? selectedImage.rect,
      contextElement: floatingBoundary ?? undefined,
    });
  }, [floatingBoundary, getReferenceRect, refs, selectedImage.rect]);

  useEffect(() => {
    if (!usesFloatingPosition) return;
    window.addEventListener(EDITOR_UI_SCALE_CHANGE_EVENT, update);
    return () =>
      window.removeEventListener(EDITOR_UI_SCALE_CHANGE_EVENT, update);
  }, [update, usesFloatingPosition]);

  const toolbar = (
    <TooltipProvider delayDuration={400} skipDelayDuration={100}>
      <div
        ref={usesFloatingPosition ? refs.setFloating : undefined}
        data-goose-image-toolbar
        className="fixed z-[20000]"
        style={
          usesFloatingPosition
            ? floatingStyles
            : {
                top: Math.max(
                  8,
                  selectedImage.rect.top - getScaledEditorUiPx(40),
                ),
                left: selectedImage.rect.left + selectedImage.rect.width / 2,
                transform: "translateX(-50%)",
              }
        }
        onMouseDown={(e) => e.preventDefault()}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <SelectionToolbarSurface context="image" aria-label={t("imageActions")} className="goose-editor-context-ui goose-block-toolbar-surface animate-in fade-in-0 zoom-in-95 duration-150">
          {(
            [
              ["left", t("alignLeft"), AlignLeft],
              ["center", t("alignCenter"), AlignCenter],
              ["right", t("alignRight"), AlignRight],
            ] as const
          ).map(([alignment, label, Icon]) => (
            <ImageToolButton
              key={alignment}
              label={label}
              pressed={selectedImage.alignment === alignment}
              tooltipSideOffset={getScaledEditorUiPx(8, editorUiScale)}
              onClick={() => applyImageAlignment(alignment)}
            >
              <Icon className="h-[15px] w-[15px]" />
            </ImageToolButton>
          ))}

          <div className="goose-block-toolbar-separator" />
          <ImageEditControls editor={editor} blockId={selectedImage.blockId} />

          <ImageToolButton
            label={openImageLabel}
            tooltipSideOffset={getScaledEditorUiPx(8, editorUiScale)}
            onClick={handleSelectedImageZoom}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
              handleSelectedImageSystemPreview?.();
            }}
          >
            <Maximize2 className="h-[15px] w-[15px]" />
          </ImageToolButton>
          <ImageToolButton
            label={t("copyImage")}
            tooltipSideOffset={getScaledEditorUiPx(8, editorUiScale)}
            onClick={handleSelectedImageCopy}
          >
            <Copy className="h-[15px] w-[15px]" />
          </ImageToolButton>
          <ImageToolButton
            label={t("downloadImage")}
            tooltipSideOffset={getScaledEditorUiPx(8, editorUiScale)}
            onClick={handleSelectedImageDownload}
          >
            <Download className="h-[15px] w-[15px]" />
          </ImageToolButton>
        </SelectionToolbarSurface>
      </div>
    </TooltipProvider>
  );

  return usesFloatingPosition && typeof document !== "undefined"
    ? createPortal(toolbar, document.body)
    : toolbar;
}
