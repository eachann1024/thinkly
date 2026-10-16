import * as React from "react";
import { FloatingFocusManager, FloatingList, FloatingPortal, useMergeRefs } from "@floating-ui/react";
import { cn } from "@/lib/utils";
import { floatingMenuMotionStyle } from "../floating-menu-motion";

import { useMenu } from "./state";
import { OverlayLayerProvider, useOverlayLayer, useOverlayTopLayer } from "../overlay-layer";

type ContentProps = React.HTMLAttributes<HTMLDivElement> & {
  editorContext?: boolean;
  onCloseAutoFocus?: (event: Event) => void;
  sideOffset?: number;
  alignOffset?: number;
  collisionPadding?: number;
};
export const ContextMenuContent = React.forwardRef<HTMLDivElement, ContentProps>(
  (
    {
      className,
      children,
      editorContext,
      onCloseAutoFocus,
      sideOffset,
      alignOffset,
      collisionPadding,
      style,
      ...props
    },
    forwardedRef,
  ) => {
    const state = useMenu();
    const layer = useOverlayLayer("menu");
    const topLayer = useOverlayTopLayer(layer);
    const ref = useMergeRefs([forwardedRef, state.refs.setFloating]);
    const callback = React.useRef(onCloseAutoFocus);
    callback.current = onCloseAutoFocus;
    const restore = React.useMemo(
      () => ({
        get current() {
          const event = new Event("closeAutoFocus", { cancelable: true });
          callback.current?.(event);
          return event.defaultPrevented
            ? (document.activeElement as HTMLElement)
            : (state.refs.domReference.current as HTMLElement);
        },
      }),
      [state.refs],
    );
    if (!state.isMounted) return null;
    const surface =
      "goose-menu-surface min-w-[9.5rem] max-h-[calc(100dvh-16px)] overflow-y-auto overscroll-contain p-1 text-popover-foreground";
    return (
      <OverlayLayerProvider layer={layer}>
      <FloatingPortal>
        <FloatingFocusManager
          context={state.context}
          modal={false}
          disabled={!state.open}
          initialFocus={state.nested ? -1 : 0}
          returnFocus={restore}
        >
          <div
            {...state.getFloatingProps(props)}
            aria-labelledby={
              props["aria-label"]
                ? undefined
                : state.refs.domReference.current?.id
            }
            ref={ref}
            tabIndex={-1}
            hidden={!state.isMounted}
            inert={!state.open}
            aria-hidden={!state.open || undefined}
            data-state={state.open ? "open" : "closed"}
            data-side={state.placement.split("-")[0]}
            data-motion={state.motionMode}
            data-goose-floating-content=""
            data-goose-layer={layer}
            data-react-aria-top-layer={topLayer || undefined}
            data-goose-menu-slot={!editorContext ? "root" : undefined}
            className={cn(
              "outline-none",
              !editorContext && surface,
              !editorContext && className,
            )}
            style={{
              ...state.floatingStyles,
              ...style,
              zIndex: layer,
              ...floatingMenuMotionStyle(
                state.status,
                state.placement,
                state.motionMode,
                { shift: state.nested },
              ),
              pointerEvents: state.open ? style?.pointerEvents : "none",
            }}
          >
            <FloatingList elementsRef={state.elements} labelsRef={state.labels}>
              {editorContext ? (
                <div
                  data-goose-menu-slot="root"
                  className={cn("goose-editor-context-ui", surface, className)}
                >
                  {children}
                </div>
              ) : (
                children
              )}
            </FloatingList>
          </div>
        </FloatingFocusManager>
      </FloatingPortal>
      </OverlayLayerProvider>
    );
  },
);
export const ContextMenuSubContent = ContextMenuContent;
export function ContextMenuPortal({ children }: React.PropsWithChildren) {
  return <>{children}</>;
}

ContextMenuContent.displayName = "ContextMenuContent";
