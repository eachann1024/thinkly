import { isWorkspaceSettingsOpen } from "@/lib/settings-navigation";
import { type FC, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { OverlayLayerProvider, useOverlayLayer } from "@/components/ui/overlay-layer";
import { useBlockHandleMenuOpen } from "../../state/blockHandleMenu";
import { useFormattingToolbarAi } from "@/components/editor/state/formattingToolbarAi";
import { FormattingToolbarExtension } from "@blocknote/core/extensions";
import {
  useBlockNoteEditor,
  useExtension,
  type FormattingToolbarProps,
} from "@blocknote/react";

type FixedFormattingToolbarControllerProps = {
  formattingToolbar: FC<FormattingToolbarProps>;
  open: boolean;
};

export function FixedFormattingToolbarController({
  formattingToolbar: Component,
  open,
}: FixedFormattingToolbarControllerProps) {
  const editor = useBlockNoteEditor();
  const layer = useOverlayLayer("toolbar");
  const blockHandleMenuOpen = useBlockHandleMenuOpen(editor);
  const inlineAiActive = useFormattingToolbarAi((state) => state.active && state.owner === editor);
  const formattingToolbar = useExtension(FormattingToolbarExtension, {
    editor,
  });
  const [hovered, setHovered] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isWorkspaceSettingsOpen()) return;
      if (inlineAiActive || blockHandleMenuOpen) return;
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing || event.repeat) return;
      if (!open && !hovered) return;
      event.preventDefault();
      event.stopPropagation();
      formattingToolbar.store.setState(false);
      editor.focus();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [editor, formattingToolbar.store, open, hovered, inlineAiActive, blockHandleMenuOpen]);

  useEffect(() => {
    const vk = (
      navigator as Navigator & {
        virtualKeyboard?: {
          overlaysContent: boolean;
          boundingRect: { height: number };
          addEventListener: (type: string, listener: () => void) => void;
          removeEventListener: (type: string, listener: () => void) => void;
        };
      }
    ).virtualKeyboard;

    if (vk) {
      vk.overlaysContent = true;
      const onGeometryChange = () => {
        setKeyboardOffset(vk.boundingRect.height || 0);
      };
      vk.addEventListener("geometrychange", onGeometryChange);
      onGeometryChange();
      return () => vk.removeEventListener("geometrychange", onGeometryChange);
    }

    const vp = window.visualViewport;
    if (!vp) return;

    const update = () => {
      const layoutHeight = document.documentElement.clientHeight;
      const height = Math.max(0, layoutHeight - vp.height - vp.offsetTop);
      setKeyboardOffset(height > 50 ? height : 0);
    };

    vp.addEventListener("resize", update);
    vp.addEventListener("scroll", update);
    update();
    return () => {
      vp.removeEventListener("resize", update);
      vp.removeEventListener("scroll", update);
    };
  }, []);

  useEffect(() => {
    if (blockHandleMenuOpen) setHovered(false);
  }, [blockHandleMenuOpen]);

  const visible = !blockHandleMenuOpen && !inlineAiActive && (open || hovered);
  if (!visible || typeof document === "undefined") return null;

  return createPortal(
    <OverlayLayerProvider layer={layer}>
    <div
      data-goose-formatting-toolbar-dock
      className="goose-formatting-toolbar-dock pointer-events-none fixed inset-x-0 flex transition-[opacity,transform,bottom] duration-150 ease-out"
      style={{
        zIndex: layer,
        bottom: `calc(${keyboardOffset}px + env(safe-area-inset-bottom, 0px))`,
      }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <div className="pointer-events-auto w-full min-w-0">
        <Component />
      </div>
    </div>
    </OverlayLayerProvider>,
    document.body,
  );
}
