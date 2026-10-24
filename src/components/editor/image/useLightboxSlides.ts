import { useCallback, useEffect, useRef, useReducer, useLayoutEffect } from "react";
import { useEditorPlatform } from "@/components/editor/platform/context";
import { useEditorPageContext } from "@/components/editor/platform/hostContext";
import { getImageElements, resolveImageSrc } from "./imageUtils";
import type { ImageLightboxProps, SlideInfo } from "./lightboxTypes";

import { lightboxSlideReducer } from "./lightboxSlideState";

export function useLightboxSlides(
  editorContainerRef: ImageLightboxProps["editorContainerRef"],
) {
  const platform = useEditorPlatform();
  const { page, getActivePageLocalFilePath } = useEditorPageContext();
  const pagePath = getActivePageLocalFilePath();
  const [state, dispatch] = useReducer(lightboxSlideReducer, { phase: "closed" });
  const requestRef = useRef(0);
  const snapshot = "snapshot" in state ? state.snapshot : undefined;
  const open = state.phase === "open" || state.phase === "refreshing";
  const slides = snapshot?.slides ?? [];
  const index = snapshot?.index ?? 0;
  const closeLightbox = useCallback(() => {
    requestRef.current += 1;
    dispatch({ type: "closed" });
  }, []);
  useLayoutEffect(() => {
    closeLightbox();
    return () => { requestRef.current += 1; };
  }, [page.id, pagePath, closeLightbox]);
  const viewSlide = (index: number) => dispatch({ type: "slide-viewed", index });
  const resolvedUrlsRef = useRef<Map<string, string>>(new Map());
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const cleanupObjectUrls = useCallback(() => {
    objectUrlsRef.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {
      }
    });
    objectUrlsRef.current.clear();
    resolvedUrlsRef.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      requestRef.current += 1;
      cleanupObjectUrls();
    };
  }, [cleanupObjectUrls]);
  const buildSlides = useCallback(
    async (images: HTMLImageElement[], request: number, pagePath: string | null): Promise<SlideInfo[]> => {
      const slides: SlideInfo[] = [];

      for (const img of images) {
        const src = img.src || img.getAttribute("src") || "";
        const alt = img.alt || img.getAttribute("alt") || "";

        if (!src) continue;

        const cacheKey = JSON.stringify([pagePath, src]);
        let resolved = resolvedUrlsRef.current.get(cacheKey);
        if (!resolved) {
          resolved = await resolveImageSrc(
            src,
            platform,
            pagePath,
          );
          if (requestRef.current !== request) {
            if (resolved.startsWith("blob:") && resolved !== src) URL.revokeObjectURL(resolved);
            return [];
          }
          resolvedUrlsRef.current.set(cacheKey, resolved);
          if (resolved.startsWith("blob:") && resolved !== src) {
            objectUrlsRef.current.add(resolved);
          }
        }

        slides.push({ src: resolved, alt });
      }

      return slides;
    },
    [platform],
  );

  const openLightboxAtImage = useCallback(
    async (img: HTMLImageElement) => {
      const container = editorContainerRef.current;
      if (!container) return;

      const images = getImageElements(container).filter((image) => Boolean(image.src || image.getAttribute("src")));
      const clickedIndex = images.indexOf(img);
      if (clickedIndex < 0) return;

      const pagePath = getActivePageLocalFilePath();
      const request = ++requestRef.current;
      dispatch({ type: "open-requested", request });
      try {
        const newSlides = await buildSlides(images, request, pagePath);
        if (requestRef.current !== request) return;
        if (editorContainerRef.current !== container || getActivePageLocalFilePath() !== pagePath) {
          closeLightbox();
          return;
        }
        dispatch({ type: "prepared", request, slides: newSlides, index: clickedIndex });
      } catch {
        if (requestRef.current === request) dispatch({ type: "failed", request });
      }
    },
    [editorContainerRef, buildSlides, getActivePageLocalFilePath, closeLightbox],
  );
  const handleImageDoubleClick = useCallback(
    async (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const img = target.closest<HTMLImageElement>(
        '.bn-block-content[data-content-type="image"] img, .bn-block-content[data-content-type="imageResize"] img',
      );
      if (!img) return;

      event.preventDefault();
      event.stopPropagation();

      await openLightboxAtImage(img);
    },
    [openLightboxAtImage],
  );

  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;

    container.addEventListener("dblclick", handleImageDoubleClick);
    return () => {
      container.removeEventListener("dblclick", handleImageDoubleClick);
    };
  }, [editorContainerRef, handleImageDoubleClick]);

  return {
    open,
    closeLightbox,
    index,
    viewSlide,
    slides,
    currentSlide: slides[index],
    openLightboxAtImage,
  };
}
