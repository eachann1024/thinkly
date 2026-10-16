import { ListRow } from "@/components/ui/list-row";
import * as GooseIcons from "@/components/ui/icons";
import { isWorkspaceSettingsOpen } from "@/lib/settings-navigation";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useEffect, useRef, useReducer } from "react";

import { exportSubmenuReducer, exportSubmenuIsOpen, type ExportSubmenuEvent } from "./exportSubmenuState";

const EXPORT_OPEN_DELAY_MS = 80;
const EXPORT_CLOSE_DELAY_MS = 150;
const EXPORT_MENU_PAD_PX = 8;

function pointInElement(
  x: number,
  y: number,
  element: HTMLElement | null,
  pad = 0,
) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  return (
    x >= rect.left - pad &&
    x <= rect.right + pad &&
    y >= rect.top - pad &&
    y <= rect.bottom + pad
  );
}

export function PageExportSubmenu({
  enabled,
  viewportHeight,
  onExportMarkdown,
  onExportHtml,
  onExportWord,
  onExportPdf,
}: {
  enabled: boolean;
  viewportHeight: number;
  onExportMarkdown: () => void;
  onExportHtml: () => void;
  onExportWord: () => void;
  onExportPdf: () => void;
}) {
  const [state, dispatch] = useReducer(exportSubmenuReducer, { status: "closed" });
  const stateRef = useRef(state);
  stateRef.current = state;
  const send = (event: ExportSubmenuEvent) => {
    stateRef.current = exportSubmenuReducer(stateRef.current, event);
    dispatch(event);
  };
  const open = exportSubmenuIsOpen(state);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  const clearTimers = () => {
    if (openTimer.current != null) {
      window.clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const closeNow = () => {
    send({ type: "dismiss" });
    clearTimers();
  };

  const pointerInHoverZone = (x: number, y: number) =>
    pointInElement(x, y, triggerRef.current, 2) ||
    pointInElement(x, y, menuRef.current, EXPORT_MENU_PAD_PX);

  useEffect(() => () => clearTimers(), []);
  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      const menu = document.querySelector<HTMLDivElement>(".goose-page-menu-export");
      if (menu) menuRef.current = menu;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);
  useEffect(() => {
    if (!enabled) {
      clearTimers();
      send({ type: "disable" });
      return;
    }
    const onMove = (event: PointerEvent) => {
      if (pointerInHoverZone(event.clientX, event.clientY)) {
        send({ type: "enter" });
        if (stateRef.current.status !== "opening") {
          if (closeTimer.current != null) window.clearTimeout(closeTimer.current);
          closeTimer.current = null;
          return;
        }
        if (openTimer.current != null) return;
        openTimer.current = window.setTimeout(() => {
          openTimer.current = null;
          send({ type: "open-delay" });
        }, EXPORT_OPEN_DELAY_MS);
        return;
      }
      send({ type: "leave" });
      if (openTimer.current != null) window.clearTimeout(openTimer.current);
      openTimer.current = null;
      if (stateRef.current.status !== "closing" || closeTimer.current != null) return;
      closeTimer.current = window.setTimeout(() => {
        closeTimer.current = null;
        send({ type: "close-delay" });
      }, EXPORT_CLOSE_DELAY_MS);
    };
    document.addEventListener("pointermove", onMove);
    return () => document.removeEventListener("pointermove", onMove);
  }, [enabled]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (isWorkspaceSettingsOpen()) return;
      if (event.key !== "Escape") return;
      event.stopPropagation();
      closeNow();
      triggerRef.current?.focus();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open]);

  const select = (action: () => void) => {
    closeNow();
    action();
  };

  const itemClass =
    "goose-menu-item goose-list-row group grid min-h-[32px] w-full cursor-default grid-cols-[16px_minmax(0,1fr)] items-center gap-x-2 rounded-lg px-2 text-left text-xs";

  return (
    <Popover
      open={open}
      modal={false}
      onOpenChange={(next) => {
        if (next) {
          clearTimers();
          send({ type: "activate" });
        }
      }}
    >
      <PopoverTrigger asChild>
        <ListRow
          ref={triggerRef}
          type="button"
          data-state={open ? "open" : "closed"}
          aria-haspopup="menu"
          aria-expanded={open}
          onPointerEnter={(event) => {
            if (!enabled || !pointerInHoverZone(event.clientX, event.clientY)) return;
            send({ type: "enter" });
            if (stateRef.current.status !== "opening" || openTimer.current != null) return;
            openTimer.current = window.setTimeout(() => {
              openTimer.current = null;
              send({ type: "open-delay" });
            }, EXPORT_OPEN_DELAY_MS);
          }}
          className="goose-menu-item goose-list-row group grid min-h-[32px] w-full cursor-default grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-x-2 rounded-lg px-2 text-left text-xs"
        >
          <GooseIcons.Export className="h-3.5 w-3.5 text-muted-foreground group-focus:text-[var(--goose-interactive-selected-fg)] group-data-[state=open]:text-[var(--goose-interactive-selected-fg)]" />
          <span className="min-w-0 truncate">导出</span>
          <GooseIcons.ChevronRight className="ml-auto h-4 w-4" />
        </ListRow>
      </PopoverTrigger>
      <PopoverContent
        variant="menu"
        ref={menuRef}
        side="right"
        align="start"
        sideOffset={2}
        alignOffset={-6}
        collisionPadding={8}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        className="goose-page-menu-export goose-page-menu-surface w-auto"
        style={{
          maxHeight:
            viewportHeight <= 0
              ? undefined
              : `${Math.max(120, viewportHeight - 16)}px`,
        }}
      >
        <div role="menu" aria-label="导出" className="goose-list-layout">
          <ListRow
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => select(onExportMarkdown)}
          >
            <GooseIcons.FileCode className="h-3.5 w-3.5 text-muted-foreground group-focus:text-[var(--goose-interactive-selected-fg)]" />
            <span className="min-w-0 truncate">Markdown</span>
          </ListRow>
          <ListRow
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => select(onExportHtml)}
          >
            <GooseIcons.FileType className="h-3.5 w-3.5 text-muted-foreground group-focus:text-[var(--goose-interactive-selected-fg)]" />
            <span className="min-w-0 truncate">HTML</span>
          </ListRow>
          <ListRow
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => select(onExportWord)}
          >
            <GooseIcons.File className="h-3.5 w-3.5 text-muted-foreground group-focus:text-[var(--goose-interactive-selected-fg)]" />
            <span className="min-w-0 truncate">Word</span>
          </ListRow>
          <ListRow
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => select(onExportPdf)}
          >
            <GooseIcons.FileText className="h-3.5 w-3.5 text-muted-foreground group-focus:text-[var(--goose-interactive-selected-fg)]" />
            <span className="min-w-0 truncate">PDF</span>
          </ListRow>
        </div>
      </PopoverContent>
    </Popover>
  );
}
