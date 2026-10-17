import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/SidebarOutline.tsx#localMessages:1">`
zh-Hans:
  selectANoteToViewIts_13a8: "选择一篇笔记查看大纲"
  thisNoteIsUnavailable_0618: "当前笔记不可用"
  foldersDoNotHaveAnOutline_45b6: "文件夹无大纲结构"
  loadingOutline_1285: "正在载入大纲…"
  noteContentIsTemporarilyUnavailable_0257: "当前正文暂不可用"
en:
  selectANoteToViewIts_13a8: "Select a note to view its outline"
  thisNoteIsUnavailable_0618: "This note is unavailable"
  foldersDoNotHaveAnOutline_45b6: "Folders do not have an outline"
  loadingOutline_1285: "Loading outline…"
  noteContentIsTemporarilyUnavailable_0257: "Note content is temporarily unavailable"
`;
const uiText = createTranslator(localMessages);
import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  isFoldableHeadingBlock,
  toggleHeadingCollapsed,
} from "@/components/editor/core/headingSectionFold";
import { OutlinePanel } from "../outline/OutlinePanel";
import { useHeadings } from "../outline/useHeadings";
import type { HeadingItem } from "../outline/useHeadings";
import {
  getHeadingAnchorElement,
  OUTLINE_SCROLL_TARGET_OFFSET,
  useActiveHeading,
} from "../outline/useActiveHeading";
import { usePages } from "@/stores/usePages";
import { useOptionalEditorPaneRegistry } from "../editor-split/editorPaneRegistry";

const subscribeEmpty = () => () => {};
const getEmptyVersion = () => 0;

interface SidebarOutlineProps {
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  pageId?: string | null;
  paneId?: string | null;
  focusKey?: string;
}

export function SidebarOutline({
  scrollContainerRef,
  pageId,
  paneId,
  focusKey = pageId ?? "",
}: SidebarOutlineProps) {
  useLocale();
  const page = usePages((state) =>
    pageId ? state.pages[pageId] : undefined,
  );
  const pageCanHaveOutline = Boolean(page && !page.isFolder && !page.trashedAt);
  const registry = useOptionalEditorPaneRegistry();
  const registryVersion = useSyncExternalStore(
    registry?.subscribe ?? subscribeEmpty,
    registry?.getVersion ?? getEmptyVersion,
    registry?.getVersion ?? getEmptyVersion,
  );
  const focusedPane = registry?.getFocusedEntry() ?? null;
  const paneMatches = Boolean(
    paneId &&
      pageId &&
      focusedPane?.paneId === paneId &&
      focusedPane.pageId === pageId,
  );
  const editor = pageCanHaveOutline && paneMatches
    ? focusedPane?.editor ?? null
    : null;
  const focusedScrollRef = useMemo<React.RefObject<HTMLDivElement | null>>(
    () => ({
      get current() {
        const current = registry?.getFocusedEntry();
        if (registry) {
          if (
            !current ||
            current.paneId !== paneId ||
            current.pageId !== pageId
          ) {
            return null;
          }
          return current.scrollEl;
        }
        return scrollContainerRef?.current ?? null;
      },
      set current(_value) {},
    }),
    [focusKey, pageId, paneId, registry, registryVersion, scrollContainerRef],
  );

  const loadedHeadings = useHeadings(editor, pageId);
  const headings = pageCanHaveOutline && editor ? loadedHeadings : [];
  const headingIds = useMemo(() => {
    const ids: string[] = [];
    const visit = (items: HeadingItem[]) => {
      for (const item of items) {
        ids.push(item.id);
        if (item.children.length > 0) visit(item.children);
      }
    };
    visit(headings);
    return ids;
  }, [headings]);
  const activeId = useActiveHeading(focusedScrollRef, headingIds);

  const handleHeadingClick = useCallback(
    (blockId: string) => {
      const container = focusedScrollRef.current;
      if (!container) return;
      const el = getHeadingAnchorElement(container, blockId);
      if (!el) return;
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const targetScroll =
        container.scrollTop +
        elRect.top -
        containerRect.top -
        OUTLINE_SCROLL_TARGET_OFFSET;
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth";
      container.scrollTo({ top: Math.max(0, targetScroll), behavior });
      window.dispatchEvent(new CustomEvent("goose-note:sidebar-navigation-complete"));
    },
    [focusedScrollRef],
  );

  const handleHeadingToggle = useCallback(
    (blockId: string) => {
      if (!editor) return;
      const block = editor.getBlock(blockId);
      if (!isFoldableHeadingBlock(block, editor.document[0]?.id)) return;
      toggleHeadingCollapsed(editor, blockId);
    },
    [editor],
  );

  const emptyMessage = !pageId
    ? uiText("selectANoteToViewIts_13a8")
    : !page || page.trashedAt
      ? uiText("thisNoteIsUnavailable_0618")
      : page.isFolder
          ? uiText("foldersDoNotHaveAnOutline_45b6")
          : !paneMatches
            ? registry
              ? uiText("loadingOutline_1285")
              : uiText("noteContentIsTemporarilyUnavailable_0257")
          : !editor
            ? uiText("loadingOutline_1285")
            : undefined;

  return (
    <OutlinePanel
      key={pageId ?? "outline"}
      headings={headings}
      activeId={activeId}
      onHeadingClick={handleHeadingClick}
      onHeadingToggle={handleHeadingToggle}
      emptyMessage={emptyMessage}
      emptyHint={emptyMessage ? null : undefined}
    />
  );
}
