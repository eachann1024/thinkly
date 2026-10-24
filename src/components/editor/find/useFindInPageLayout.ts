import { useLayoutEffect, useState, type CSSProperties, type RefObject } from "react";
import { useEditorUiScale } from "@/components/editor/hooks/useEditorUiScale";
import { getScaledEditorUiPx } from "@/components/editor/utils/editorContextUi";

export function useFindInPageLayout(
  open: boolean,
  editorContainerRef: RefObject<HTMLDivElement | null>,
) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const scale = useEditorUiScale();
  const offset = getScaledEditorUiPx(8, scale);

  useLayoutEffect(() => {
    setHost(open
      ? editorContainerRef.current?.closest<HTMLElement>("[data-editor-overlay-host]") ?? null
      : null);
  }, [open, editorContainerRef]);

  const top = host ? `${offset}px` : `calc(var(--electron-titlebar-height, 2.75rem) + ${offset}px)`;
  const style: CSSProperties = {
    position: host ? "absolute" : "fixed",
    zIndex: host ? 20 : 20500,
    right: offset,
    top,
    width: "calc(26rem * var(--editor-scale, 1))",
    maxWidth: `max(0px, calc(100% - ${offset * 2}px))`,
    maxHeight: `max(0px, calc(${host ? "100%" : "100dvh"} - ${top} - ${offset}px))`,
    overflow: "auto",
  };
  return { host, style };
}
