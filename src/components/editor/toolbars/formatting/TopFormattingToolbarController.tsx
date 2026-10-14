import { type RefObject, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FixedEditorFormattingToolbar } from "@/components/editor/toolbars/formatting";
import {
  FIXED_TOOLBAR_PANE_ATTR,
  FIXED_TOOLBAR_SLOT_ATTR,
  type FixedFormattingToolbarVariant,
} from "@/components/editor/toolbars/formatting/toolbarMode";

/**
 * 顶部固定格式工具栏：挂到编辑器所在窗格的顶部插槽，不随正文滚动。
 * 宿主未提供插槽（历史视图等）时不渲染。
 */
export function TopFormattingToolbarController({
  variant,
  editorContainerRef,
}: {
  variant: FixedFormattingToolbarVariant;
  editorContainerRef: RefObject<HTMLElement | null>;
}) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  // 编辑器可能先于窗格插槽挂载（切页 / 分屏重排），找不到时逐帧重试一小段时间。
  useLayoutEffect(() => {
    let frame = 0;
    let attempts = 0;
    const locate = () => {
      const pane = editorContainerRef.current?.closest(
        `[${FIXED_TOOLBAR_PANE_ATTR}]`,
      );
      const next =
        pane?.querySelector<HTMLElement>(`[${FIXED_TOOLBAR_SLOT_ATTR}]`) ??
        null;
      if (next) {
        setSlot(next);
        return;
      }
      if (attempts++ < 60) frame = requestAnimationFrame(locate);
    };
    locate();
    return () => cancelAnimationFrame(frame);
  }, [editorContainerRef]);

  if (!slot) return null;

  return createPortal(
    <div className="goose-fixed-top-toolbar" data-variant={variant}>
      <div className="goose-fixed-top-toolbar-inner">
        <FixedEditorFormattingToolbar />
      </div>
    </div>,
    slot,
  );
}
