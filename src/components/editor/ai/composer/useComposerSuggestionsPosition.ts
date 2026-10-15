import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { EDITOR_UI_SCALE_CHANGE_EVENT } from "@/lib/appearance";
import { getEditorUiScale } from "@/components/editor/utils/editorContextUi";
import { getComposerCaretTextContext } from "./composerCommandDetection";

const MAX_HEIGHT = 280;
const MAX_WIDTH = 340;
const VIEWPORT_PADDING = 8;
const GAP = 4;
const MIN_USEFUL_HEIGHT = 40;

interface SuggestionPosition {
  left: number;
  edge: number;
  above: boolean;
  maxWidth: number;
  maxHeight: number;
}

/** 只读当前 token 的位置；输入换行、滚动或缩放后不沿用旧的 viewport rect。 */
function readAnchorLeft(composer: HTMLElement, trigger: "@" | "/", fallback: DOMRect) {
  const caret = getComposerCaretTextContext(composer);
  const index = caret?.beforeCaret.lastIndexOf(trigger) ?? -1;
  if (caret && index >= 0) {
    const range = document.createRange();
    range.setStart(caret.textNode, index);
    range.setEnd(caret.textNode, caret.beforeCaret.length);
    const rect = range.getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) return rect.left;
  }
  return Number.isFinite(fallback.left) && (fallback.width > 0 || fallback.height > 0)
    ? fallback.left
    : composer.getBoundingClientRect().left;
}

/** 外层固定坐标使用 viewport px，内层 context-ui 的尺寸只换算一次 CSS zoom。 */
export function useComposerSuggestionsPosition(
  composerRef: RefObject<HTMLDivElement | null>,
  anchorRect: DOMRect,
  trigger: "@" | "/",
) {
  const floatingRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<SuggestionPosition | null>(null);

  useLayoutEffect(() => {
    const composer = composerRef.current;
    const floating = floatingRef.current;
    if (!composer || !floating) return;
    // PromptBar 包含 shell 外侧的边框；compact 入口没有 shell 时使用自身输入区域。
    const shell = composer.closest<HTMLElement>(".bui-prompt-bar")
      ?? composer.closest<HTMLElement>(".notebook-ai-composer-shell")
      ?? composer;
    let frame = 0;
    const update = () => {
      const rect = shell.getBoundingClientRect();
      const scale = getEditorUiScale();
      const viewport = window.visualViewport;
      const viewportLeft = (viewport?.offsetLeft ?? 0) + VIEWPORT_PADDING;
      const viewportTop = (viewport?.offsetTop ?? 0) + VIEWPORT_PADDING;
      const viewportRight = (viewport?.offsetLeft ?? 0)
        + (viewport?.width ?? window.innerWidth) - VIEWPORT_PADDING;
      const viewportBottom = (viewport?.offsetTop ?? 0)
        + (viewport?.height ?? window.innerHeight) - VIEWPORT_PADDING;
      const aboveEdge = Math.min(rect.top - GAP * scale, viewportBottom);
      const belowEdge = Math.max(rect.bottom + GAP * scale, viewportTop);
      const spaceAbove = Math.max(0, aboveEdge - viewportTop);
      const spaceBelow = Math.max(0, viewportBottom - belowEdge);
      // 底部面板优先上方并缩短滚动区；上方连一行都放不下才使用更宽裕的下方。
      const above = spaceAbove >= MIN_USEFUL_HEIGHT * scale || spaceAbove >= spaceBelow;
      const maxWidth = Math.max(0, Math.min(MAX_WIDTH, (viewportRight - viewportLeft) / scale));
      const maxHeight = Math.min(MAX_HEIGHT, Math.floor((above ? spaceAbove : spaceBelow) / scale));
      const width = Math.min(floating.getBoundingClientRect().width, maxWidth * scale);
      const next: SuggestionPosition = {
        left: Math.max(viewportLeft, Math.min(readAnchorLeft(composer, trigger, anchorRect), viewportRight - width)),
        edge: above ? window.innerHeight - aboveEdge : belowEdge,
        above,
        maxWidth,
        maxHeight,
      };
      setPosition((previous) => previous && Object.entries(next).every(
        ([key, value]) => previous[key as keyof SuggestionPosition] === value,
      ) ? previous : next);
    };
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(shell);
    observer.observe(composer);
    observer.observe(floating);
    update();
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    window.addEventListener(EDITOR_UI_SCALE_CHANGE_EVENT, schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("scroll", schedule);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener(EDITOR_UI_SCALE_CHANGE_EVENT, schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
    };
  }, [anchorRect, composerRef, trigger]);

  const style: CSSProperties = {
    position: "fixed",
    width: "max-content",
    left: position?.left,
    zIndex: 9999,
    visibility: position && position.maxHeight >= 2 && position.maxWidth >= 2 ? "visible" : "hidden",
    ...(position?.above ? { bottom: position.edge } : { top: position?.edge }),
  };
  return {
    floatingRef,
    style,
    maxWidth: position?.maxWidth ?? MAX_WIDTH,
    maxHeight: position?.maxHeight ?? MAX_HEIGHT,
  };
}
