import "@/pages/workspace/styles/workspace/native-titlebar.css";
import "./standalone-window.css";
import { useEffect, useRef, type ReactNode, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent } from "react";
import { WinWindowControls } from "@/pages/workspace/components/page/WinWindowControls";
import { getGooseDesktop } from "@/lib/electron/runtime";
import { bindIdleWindowDrag } from "@/lib/electron/windowDrag";
import { cn } from "@/lib/utils";

const INTERACTIVE = "button, input, textarea, a, select, [role='button'], [role='tab'], [data-electron-no-drag]";

export type StandaloneWindowShellProps = {
  title: string;
  context?: string;
  titleLayout?: "stacked" | "inline";
  className?: string;
  /** OS window title. Defaults to the title, with the context after an em dash. */
  windowTitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
  /** Inset content card. Title-bar-only windows pass false. */
  inset?: boolean;
  /** Hide the Windows/Linux maximize button when the window cannot resize. */
  maximizable?: boolean;
};

function isInteractive(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(INTERACTIVE));
}

export function StandaloneWindowShell({
  title,
  context,
  titleLayout = "stacked",
  className,
  windowTitle,
  actions,
  children,
  inset = true,
  maximizable = true,
}: StandaloneWindowShellProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef(false);
  const platform = typeof navigator === "undefined" ? "" : navigator.platform;
  const linux = /Linux/i.test(platform);
  const frameless = /Win|Linux/i.test(platform);
  const label = windowTitle ?? (context ? `${title} — ${context}` : title);

  useEffect(() => {
    document.title = label;
    void getGooseDesktop()?.setTitle?.(label);
  }, [label]);

  useEffect(() => {
    const node = barRef.current;
    if (!node) return;
    const sync = () => {
      const height = Math.round(node.getBoundingClientRect().height);
      if (height > 0) void getGooseDesktop()?.syncTitleBarHeight?.(height);
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!linux || event.button !== 0 || isInteractive(event.target)) return;
    bindIdleWindowDrag(event, dragRef);
  };

  const onDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!linux || !maximizable || isInteractive(event.target)) return;
    void getGooseDesktop()?.toggleMaximizeWindow?.();
  };

  return (
    <div className={cn("standalone-window relative flex h-full min-h-0 flex-col bg-background text-foreground", className)}>
      <div
        ref={barRef}
        className={cn("electron-titlebar flex w-full shrink-0 items-center", frameless ? "pr-0" : "pr-3")}
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClick}
      >
        <div className={cn("min-w-0 flex-1 px-3", titleLayout === "inline" && "flex items-baseline gap-2")}>
          <div className={cn("truncate text-sm font-medium text-foreground", titleLayout === "inline" && "shrink-0 font-semibold")}>{title}</div>
          {context ? <div className={cn("truncate text-xs text-muted-foreground", titleLayout === "inline" && "text-[13px]")}>{context}</div> : null}
        </div>
        {actions ? (
          <div data-electron-no-drag className="flex shrink-0 items-center gap-1 pr-2">
            {actions}
          </div>
        ) : null}
        {frameless ? <WinWindowControls showMaximize={maximizable} /> : null}
      </div>
      {inset ? (
        <div className="min-h-0 flex-1 px-2 pb-2">
          <div className="h-full min-h-0 overflow-auto rounded-lg border border-border bg-card">
            {children}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      )}
    </div>
  );
}
