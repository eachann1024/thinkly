import { useEffect, useMemo, useRef, useState, type FC } from "react";
import {
  BlockPopover,
  PositionPopover,
  useBlockNoteEditor,
  useExtension,
  useExtensionState,
  type FloatingUIOptions,
} from "@blocknote/react";
import { autoUpdate, flip, offset, shift, size } from "@floating-ui/react";
import { GooseAIExtension } from "./GooseAIExtension";
import { GooseAIMenu } from "./GooseAIMenu";
import { useEditorPageContext } from "@/components/editor/platform/hostContext";
import {
  AI_MENU_VIEWPORT_PAD_PX,
  computeAiMenuFloatingWidth,
} from "@/components/editor/ai/aiMenuFloatingWidth";
import { setFakeSelection } from "@/components/editor/extensions/fakeSelectionExtension";
import { isEmptyParagraphBlock } from "./emptyParagraphAiShortcut";
import { useFormattingToolbarAi } from "@/components/editor/state/formattingToolbarAi";
import {
  getEditorUiScale,
  getScaledEditorUiPx,
} from "@/components/editor/utils/editorContextUi";
import "@/pages/workspace/styles/editor-ai-menu.css";
import "./inlinePreview.css";

type GooseAIMenuControllerProps = {
  aiMenu?: FC;
  isActiveEditor?: boolean;
};

type BnColorScheme = "light" | "dark";

function resolveBnColorScheme(
  editorDom: HTMLElement | null | undefined,
): BnColorScheme {
  const fromEditor = editorDom
    ?.closest(".bn-root")
    ?.getAttribute("data-color-scheme");
  if (fromEditor === "dark" || fromEditor === "light") return fromEditor;
  if (typeof document !== "undefined") {
    return document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
  }
  return "light";
}

export function GooseAIMenuController({
  aiMenu: Component = GooseAIMenu,
  isActiveEditor = true,
}: GooseAIMenuControllerProps) {
  const editor = useBlockNoteEditor();
  const { page } = useEditorPageContext();
  const ai = useExtension(GooseAIExtension);
  const aiMenuState = useExtensionState(GooseAIExtension, {
    editor,
    selector: (state) => state.aiMenuState,
  });
  const resetFormattingToolbarAi = useFormattingToolbarAi(
    (state) => state.reset,
  );
  const wasOpenRef = useRef(false);
  const [colorScheme, setColorScheme] = useState<BnColorScheme>(() =>
    resolveBnColorScheme(editor.domElement),
  );

  const open = isActiveEditor && aiMenuState !== "closed";
  const blockId = open ? aiMenuState.blockId : undefined;
  const selection = open ? ai.getSelectionAnchor() : undefined;

  useEffect(() => {
    if (!open || selection || !blockId || !isEmptyParagraphBlock(editor.getBlock(blockId))) return;
    const block = Array.from(editor.domElement?.querySelectorAll(".bn-block[data-id]") ?? [])
      .find((element) => element.getAttribute("data-id") === blockId);
    const outer = block?.closest(".bn-block-outer");
    outer?.classList.add("goose-ai-empty-target");
    return () => outer?.classList.remove("goose-ai-empty-target");
  }, [blockId, editor, open, selection]);

  useEffect(() => {
    const read = () => {
      setColorScheme(resolveBnColorScheme(editor.domElement));
    };
    read();
    if (typeof document === "undefined") return;

    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    const bnRoot = editor.domElement?.closest(".bn-root");
    if (bnRoot) {
      observer.observe(bnRoot, {
        attributes: true,
        attributeFilter: ["data-color-scheme"],
      });
    }
    return () => observer.disconnect();
  }, [editor.domElement, open]);

  useEffect(() => {
    if (wasOpenRef.current && !open) {
      try { setFakeSelection(editor, null); } catch {   }
      resetFormattingToolbarAi(editor);
    }
    wasOpenRef.current = open;
  }, [editor, open, resetFormattingToolbarAi]);

  useEffect(() => () => {
    try { setFakeSelection(editor, null); } catch {   }
    resetFormattingToolbarAi(editor);
  }, [editor, page.id, resetFormattingToolbarAi]);

  const floatingUIOptions = useMemo<FloatingUIOptions>(() => {
    const pad = AI_MENU_VIEWPORT_PAD_PX;
    const boundary =
      editor.domElement?.closest<HTMLElement>(".page-scroll-container") ??
      undefined;

    const sharedMiddleware = [
      offset(() => getScaledEditorUiPx(10)),
      flip({
        boundary,
        fallbackPlacements: ["top-start", "bottom-end", "top-end"],
        padding: pad,
      }),
      shift({
        boundary,
        padding: pad,
        crossAxis: false,
      }),
      size({
        apply({ availableWidth, availableHeight, elements }) {
          const scale = getEditorUiScale();
          const maxW = computeAiMenuFloatingWidth({
            viewportWidth:
              typeof window !== "undefined" ? window.innerWidth : 1248,
            availableWidth,
            scale,
            preferredWidth:
              36 *
              (Number.parseFloat(
                getComputedStyle(document.documentElement).fontSize,
              ) || 16),
          });
          Object.assign(elements.floating.style, {
            width: `${maxW}px`,
            maxWidth: `${maxW}px`,
            maxHeight: `${Math.max(100, availableHeight)}px`,
            overflowY: "auto",
          });
          elements.floating.style.setProperty(
            "--goose-inline-ai-layout-width",
            `${maxW / scale}px`,
          );
        },
        padding: pad,
        boundary,
      }),
    ];

    return {
      useFloatingOptions: {
        open,
        placement: "bottom-start",
        middleware: sharedMiddleware,
        onOpenChange: (nextOpen) => {
          if (nextOpen || !open) return;
          ai.closeAIMenu();
        },
        whileElementsMounted(reference, floating, update) {
          const stop = autoUpdate(reference, floating, update, {
            animationFrame: true,
          });
          const observer = new ResizeObserver(update);
          if (boundary) observer.observe(boundary);
          return () => {
            stop();
            observer.disconnect();
          };
        },
      },
      useDismissProps: {
        enabled: open,
        outsidePress: false,
      },
      elementProps: {
        className: "bn-root bn-mantine goose-ai-menu-floating",
        "data-color-scheme": colorScheme,
        style: { zIndex: 20010 },
      },
      focusManagerProps: {
        disabled: false,
        modal: false,
        returnFocus: false,
        getInsideElements: () => (editor.domElement ? [editor.domElement] : []),
      },
    };
  }, [ai, aiMenuState, colorScheme, editor.domElement, open]);

  const content = open ? (
    <div
      className="goose-editor-context-ui bn-root bn-mantine"
      data-color-scheme={colorScheme}
      style={{
        width: "var(--goose-inline-ai-layout-width, 100%)",
        minWidth: 0,
        flexShrink: 0,
      }}
    >
      <Component />
    </div>
  ) : null;

  if (selection) {
    return (
      <PositionPopover
        position={selection}
        portalElement={null}
        {...floatingUIOptions}
      >
        {content}
      </PositionPopover>
    );
  }

  return (
    <BlockPopover blockId={blockId} portalElement={null} {...floatingUIOptions}>
      {content}
    </BlockPopover>
  );
}
