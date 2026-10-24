import { EditorAction } from "@/components/editor/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBlockNoteEditor, useExtensionState } from "@blocknote/react";
import { SuggestionMenu } from "@blocknote/core/extensions";
import { Plus } from "@/components/ui/icons";
import { cn } from "@/components/editor/utils/cn";
import { EDITOR_UI_SCALE_CHANGE_EVENT } from "@/lib/appearance";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
import {
  discardUntouchedTrailingBlock,
  openTrailingBlockMenu,
  readTrailingAddAnchor,
  type TrailingAddAnchor,
} from "./trailingBlockAdd";
const messages = i18nYaml<"src/components/editor/core/EditorTrailingAdd.tsx#messages:1">`
zh-Hans:
  addBlock: "添加块"
en:
  addBlock: "Add block"
ja:
  addBlock: "ブロックを追加"
`;
const t = createTranslator(messages);

const HOVER_OPEN_DELAY_MS = 180;

export function EditorTrailingAdd() {
  useLocale();
  const editor = useBlockNoteEditor<any, any, any>();
  const menuShown = useExtensionState(SuggestionMenu, {
    selector: (state) => Boolean(state?.show),
  });
  const buttonRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ x: number; y: number; target: Element | null } | null>(null);
  const hoverTimer = useRef<number | null>(null);
  const createdId = useRef<string | undefined>(undefined);
  const [anchor, setAnchor] = useState<TrailingAddAnchor | null>(null);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimer.current === null) return;
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
  }, []);

  useEffect(() => {
    const refresh = () => {
      const last = pointer.current;
      if (!last || buttonRef.current?.contains(last.target)) return;
      const next = readTrailingAddAnchor(editor, last.x, last.y, last.target);
      setAnchor((prev) =>
        prev && next && prev.top === next.top && prev.left === next.left ? prev : next,
      );
    };
    const onPointerMove = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      pointer.current = { x: event.clientX, y: event.clientY, target };
      if (event.buttons !== 0) {
        setAnchor(null);
        return;
      }
      refresh();
    };
    const hide = () => {
      pointer.current = null;
      setAnchor(null);
    };
    document.addEventListener("pointermove", onPointerMove, true);
    document.addEventListener("scroll", refresh, true);
    document.documentElement.addEventListener("pointerleave", hide);
    window.addEventListener("resize", refresh);
    window.addEventListener(EDITOR_UI_SCALE_CHANGE_EVENT, refresh);
    window.addEventListener("blur", hide);
    return () => {
      document.removeEventListener("pointermove", onPointerMove, true);
      document.removeEventListener("scroll", refresh, true);
      document.documentElement.removeEventListener("pointerleave", hide);
      window.removeEventListener("resize", refresh);
      window.removeEventListener(EDITOR_UI_SCALE_CHANGE_EVENT, refresh);
      window.removeEventListener("blur", hide);
    };
  }, [editor]);

  useEffect(() => {
    if (menuShown) {
      setAnchor(null);
      return;
    }
    const id = createdId.current;
    if (!id) return;
    createdId.current = undefined;
    const timer = window.setTimeout(() => discardUntouchedTrailingBlock(editor, id), 0);
    return () => window.clearTimeout(timer);
  }, [editor, menuShown]);

  useEffect(() => clearHoverTimer, [clearHoverTimer]);
  useEffect(() => {
    if (!anchor) clearHoverTimer();
  }, [anchor, clearHoverTimer]);

  const openMenu = useCallback(() => {
    clearHoverTimer();
    setAnchor(null);
    const id = openTrailingBlockMenu(editor);
    if (!id) return;
    createdId.current = id;
    window.setTimeout(() => {
      if (editor.getExtension(SuggestionMenu)?.shown() || createdId.current !== id) return;
      createdId.current = undefined;
      discardUntouchedTrailingBlock(editor, id);
    }, 0);
  }, [clearHoverTimer, editor]);

  if (!anchor) return null;
  const portalTarget = editor.prosemirrorView.dom.closest(".workspace-main-sheet")
    ? document.body
    : (editor.portalElement ?? document.body);
  return createPortal(
    <div
      ref={buttonRef}
      className={cn(
        "bn-side-menu fixed z-[70]",
        "[body[data-scroll-locked]_&]:!opacity-0 [body[data-scroll-locked]_&]:!pointer-events-none",
      )}
      style={{ top: anchor.top, left: anchor.left, transform: "translate(-100%, -50%)" }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onPointerEnter={() => {
        clearHoverTimer();
        hoverTimer.current = window.setTimeout(openMenu, HOVER_OPEN_DELAY_MS);
      }}
      onPointerLeave={clearHoverTimer}
    >
      <div className="goose-editor-inline-context-ui flex items-center rounded-[10px] border border-border/50 bg-popover p-[3px] shadow-[0_1px_2px_hsl(var(--foreground)/0.05),0_8px_22px_hsl(var(--foreground)/0.06)] dark:border-white/12 dark:shadow-[0_8px_22px_rgba(0,0,0,0.35)]">
        <EditorAction
          type="button"
          aria-label={t("addBlock")}
          onClick={openMenu}
          className="flex h-6 w-[22px] items-center justify-center rounded-[7px] text-muted-foreground transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </EditorAction>
      </div>
    </div>,
    portalTarget,
  );
}
