import { EditorAction } from "@/components/editor/ui/button";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { Zoom } from "yet-another-react-lightbox/plugins";
import { Copy, Download, X, ZoomIn, ZoomOut } from "@/components/ui/icons";
import { PREVIEW_ACTION_TOOLTIP } from "@/lib/preview/previewAction";
import { ImageToolbar } from "./ImageToolbar";
import { useLightboxSlides } from "./useLightboxSlides";
import { useLightboxActions } from "./useLightboxActions";
import { useSelectedImage } from "./useSelectedImage";
import type { ImageLightboxProps } from "./lightboxTypes";
import { OverlayLayerProvider, useModalLayer, useOverlayTopLayer } from "@/components/ui/overlay-layer";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/components/editor/image/ImageLightbox.tsx#messages:1">`
zh-Hans:
  zoomIn: "放大"
  zoomOut: "缩小"
  close: "关闭"
  nextImage: "下一张"
  previousImage: "上一张"
  imagePreview: "图片预览"
  downloadImage: "下载图片"
  copyImage: "复制图片"
en:
  zoomIn: "Zoom in"
  zoomOut: "Zoom out"
  close: "Close"
  nextImage: "Next image"
  previousImage: "Previous image"
  imagePreview: "Image preview"
  downloadImage: "Download image"
  copyImage: "Copy image"
`;
const t = createTranslator(messages);


export function ImageLightbox({
  editor,
  editorContainerRef,
  editable = true,
}: ImageLightboxProps) {
  const {
    open,
    closeLightbox,
    index,
    viewSlide,
    slides,
    currentSlide,
    openLightboxAtImage,
  } = useLightboxSlides(editorContainerRef);
  const layer = useModalLayer(open);
  const topLayer = useOverlayTopLayer(layer);
  const portalContainer = {
    style: { zIndex: layer },
    "data-react-aria-top-layer": topLayer || undefined,
    "data-goose-layer": layer,
  };
  const actions = useLightboxActions(editor, editorContainerRef, currentSlide);
  const { handleDownload, handleCopy } = actions;
  const {
    selectedImage,
    applyImageAlignment,
    handleSelectedImageZoom,
    handleSelectedImageSystemPreview,
    getSelectedImageRect,
    handleSelectedImageDownload,
    handleSelectedImageCopy,
  } = useSelectedImage(
    editor,
    editorContainerRef,
    openLightboxAtImage,
    actions,
  );
  return (
    <>
      {selectedImage && !open && editable && (
        <ImageToolbar
          editor={editor}
          selectedImage={selectedImage}
          applyImageAlignment={applyImageAlignment}
          handleSelectedImageZoom={handleSelectedImageZoom}
          handleSelectedImageSystemPreview={handleSelectedImageSystemPreview}
          handleSelectedImageCopy={handleSelectedImageCopy}
          handleSelectedImageDownload={handleSelectedImageDownload}
          openImageLabel={PREVIEW_ACTION_TOOLTIP}
          floatingBoundary={
            !__GOOSE_EDITOR_COMPACT__ ? editorContainerRef.current : undefined
          }
          getReferenceRect={
            !__GOOSE_EDITOR_COMPACT__ ? getSelectedImageRect : undefined
          }
        />
      )}
      {slides.length > 0 && (
        <OverlayLayerProvider layer={layer}>
        <Lightbox
          open={open}
          close={closeLightbox}
          index={index}
          slides={slides.map((s) => ({
            src: s.src,
            alt: s.alt,
            title: s.alt || undefined,
          }))}
          plugins={[Zoom]}
          zoom={{
            maxZoomPixelRatio: 4,
            scrollToZoom: true,
            doubleClickDelay: 250,
          }}
          labels={{
            get "Zoom in"() { return t("zoomIn"); },
            get "Zoom out"() { return t("zoomOut"); },
            get Close() { return t("close"); },
            get Next() { return t("nextImage"); },
            get Previous() { return t("previousImage"); },
          }}
          carousel={{ finite: slides.length <= 1, padding: "48px" }}
          controller={{ closeOnBackdropClick: true, closeOnPullDown: true }}
          animation={{ fade: 220, swipe: 280 }}
          className="goose-image-lightbox"
          portal={{ container: portalContainer }}
          toolbar={{
            buttons: [
              <div key="title" className="goose-image-lightbox-title">
                {currentSlide?.alt || t("imagePreview")}
              </div>,
              // Zoom 插件默认把按钮前置插入工具条；用占位符锁定它在右侧操作组的位置
              "zoom",
              <EditorAction
                key="download"
                type="button"
                title={t("downloadImage")}
                aria-label={t("downloadImage")}
                onClick={handleDownload}
                className="yarl__button"
              >
                <Download size={18} strokeWidth={1.75} />
              </EditorAction>,
              <EditorAction
                key="copy"
                type="button"
                title={t("copyImage")}
                aria-label={t("copyImage")}
                onClick={handleCopy}
                className="yarl__button"
              >
                <Copy size={18} strokeWidth={1.75} />
              </EditorAction>,
              "close",
            ],
          }}
          render={{
            iconZoomIn: () => (
              <ZoomIn size={18} strokeWidth={1.75} aria-hidden="true" />
            ),
            iconZoomOut: () => (
              <ZoomOut size={18} strokeWidth={1.75} aria-hidden="true" />
            ),
            buttonClose: () => (
              <EditorAction
                key="close"
                type="button"
                title={t("close")}
                aria-label={t("close")}
                onClick={closeLightbox}
                className="yarl__button"
              >
                <X size={18} strokeWidth={1.75} />
              </EditorAction>
            ),
            buttonPrev: slides.length <= 1 ? () => null : undefined,
            buttonNext: slides.length <= 1 ? () => null : undefined,
          }}
          on={{ view: ({ index: newIndex }) => viewSlide(newIndex) }}
        />
        </OverlayLayerProvider>
      )}
    </>
  );
}
