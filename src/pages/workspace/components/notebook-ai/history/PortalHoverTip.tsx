import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { TOOLTIP_DELAY_MS } from "@/components/ui/tooltip-delay";
import { useOverlayLayer, useOverlayTopLayer } from "@/components/ui/overlay-layer";
export function PortalHoverTip({
  content,
  children,
}: {
  content: string;
  children: (handlers: {
    onMouseEnter: (event: MouseEvent<HTMLElement>) => void;
    onMouseLeave: () => void;
  }) => ReactNode;
}) {
  const layer = useOverlayLayer("tooltip");
  const topLayer = useOverlayTopLayer(layer);
  const [tip, setTip] = useState<{ top: number; left: number } | null>(null);
  const showTimerRef = useRef<number>(0);

  const clearShowTimer = () => {
    if (showTimerRef.current) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = 0;
    }
  };

  useEffect(() => () => clearShowTimer(), []);

  return (
    <>
      {children({
        onMouseEnter: (event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const maxWidth = 288;
          const left = Math.min(
            Math.max(8, rect.left),
            window.innerWidth - maxWidth - 8,
          );
          const nextTip = { top: rect.bottom + 6, left };
          clearShowTimer();
          showTimerRef.current = window.setTimeout(() => {
            setTip(nextTip);
          }, TOOLTIP_DELAY_MS);
        },
        onMouseLeave: () => {
          clearShowTimer();
          setTip(null);
        },
      })}
      {tip && typeof document !== "undefined"
        ? createPortal(
            <div
              role="tooltip"
              data-goose-layer={layer}
              data-react-aria-top-layer={topLayer || undefined}
              className="pointer-events-none fixed max-w-xs select-none whitespace-normal break-words rounded-control border border-border/80 bg-popover px-2.5 py-1.5 text-[12px] font-medium leading-snug text-popover-foreground shadow-[var(--goose-menu-shadow)]"
              style={{ top: tip.top, left: tip.left, zIndex: layer }}
            >
              {content}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
