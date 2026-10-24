import { type FC, useMemo, useRef } from "react";
import { FormattingToolbarExtension } from "@blocknote/core/extensions";
import { flip, offset, shift } from "@floating-ui/react";
import {
  GenericPopover,
  useBlockNoteEditor,
  useExtension,
  useExtensionState,
  type FloatingUIOptions,
  type FormattingToolbarProps,
  type GenericPopoverReference,
} from "@blocknote/react";

import {
  getFormattingToolbarReferenceRect,
  rememberFormattingToolbarRect,
} from "@/components/editor/utils/formattingToolbarReference";
import { useBlockHandleMenuOpen } from "../../state/blockHandleMenu";
import { getFormattingSelectionMode } from "./helpers";
import { OverlayLayerProvider, useOverlayLayer } from "@/components/ui/overlay-layer";

type GooseFormattingToolbarControllerProps = {
  formattingToolbar: FC<FormattingToolbarProps>;
  floatingUIOptions?: FloatingUIOptions;
  portalElement?: HTMLElement | null;
  open?: boolean;
};

export function GooseFormattingToolbarController({
  formattingToolbar: Component,
  floatingUIOptions: propsFloatingUIOptions,
  portalElement,
  open: openProp,
}: GooseFormattingToolbarControllerProps) {
  const editor = useBlockNoteEditor();
  const layer = useOverlayLayer("toolbar");
  const blockHandleMenuOpen = useBlockHandleMenuOpen(editor);
  const formattingToolbar = useExtension(FormattingToolbarExtension, {
    editor,
  });
  const storeOpen = useExtensionState(FormattingToolbarExtension, {
    editor,
  });

  const floatingOpen = propsFloatingUIOptions?.useFloatingOptions?.open;
  const show = !blockHandleMenuOpen && (
    typeof floatingOpen === "boolean"
      ? floatingOpen
      : openProp !== undefined
        ? storeOpen && openProp
        : storeOpen);

  const lastReferenceRectRef = useRef<DOMRect | null>(null);
  const reference = useMemo<GenericPopoverReference | undefined>(() => {
    const dom = editor.domElement;
    const contextEl =
      (dom?.firstElementChild instanceof Element
        ? dom.firstElementChild
        : null) ?? (dom instanceof Element ? dom : null);

    const getBoundingClientRect = () => {
      const mode = getFormattingSelectionMode(editor);
      const rect = getFormattingToolbarReferenceRect(editor, mode);
      return rememberFormattingToolbarRect(
        rect,
        lastReferenceRectRef,
        new DOMRect(),
      );
    };

    if (contextEl) {
      return {
        element: contextEl,
        getBoundingClientRect,
        cacheMountedBoundingClientRect: false,
      };
    }

    return {
      element: undefined,
      getBoundingClientRect,
    };
  }, [editor, editor.domElement]);

  const floatingUIOptions = useMemo<FloatingUIOptions>(() => {
    const callerFloating = propsFloatingUIOptions?.useFloatingOptions;
    const effectiveOpen =
      !blockHandleMenuOpen && (typeof callerFloating?.open === "boolean" ? callerFloating.open : show);

    return {
      ...propsFloatingUIOptions,
      useFloatingOptions: {
        placement: "top",
        middleware: [
          offset(10),
          flip({ fallbackPlacements: ["bottom"] }),
          shift(),
        ],
        ...callerFloating,
        open: effectiveOpen,
        onOpenChange: (nextOpen, event, reason) => {
          callerFloating?.onOpenChange?.(nextOpen, event, reason);
          formattingToolbar.store.setState(nextOpen);
          if (reason === "escape-key") {
            editor.focus();
          }
        },
      },
      focusManagerProps: {
        disabled: true,
        ...propsFloatingUIOptions?.focusManagerProps,
      },
      elementProps: {
        ...propsFloatingUIOptions?.elementProps,
        style: {
          ...propsFloatingUIOptions?.elementProps?.style,
          zIndex: layer,
        },
      },
    };
  }, [show, blockHandleMenuOpen, propsFloatingUIOptions, formattingToolbar.store, editor, layer]);

  return (
    <OverlayLayerProvider layer={layer}>
    <GenericPopover
      reference={reference}
      portalElement={portalElement}
      {...floatingUIOptions}
    >
      {show ? <Component /> : null}
    </GenericPopover>
    </OverlayLayerProvider>
  );
}
