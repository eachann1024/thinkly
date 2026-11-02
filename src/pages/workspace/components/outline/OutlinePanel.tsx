import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/outline/OutlinePanel.tsx#localMessages:1">`
zh-Hans:
  heading: "H{{level}} {{text}}"
  noHeadingsInThisNote: "正文暂无标题"
  documentOutline: "文档大纲"
en:
  heading: "H{{level}} {{text}}"
  noHeadingsInThisNote: "No headings in this note"
  documentOutline: "Document outline"
ja:
  heading: "H{{level}} {{text}}"
  noHeadingsInThisNote: "本文に見出しがありません"
  documentOutline: "ドキュメントのアウトライン"
`;
const uiText = createTranslator(localMessages);
import { ListRow } from "@/components/ui/list-row";
import { OutlineArt, StateArtBackdrop } from "@/components/ui/dot-matrix";
import {
  memo,
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { cn } from "@/lib/utils";
import { MainTreeRowShell } from "../sidebar/main-tree/MainTreeRowShell";
import {
  MAIN_TREE_INDENT,
  MAIN_TREE_ROW_PADDING_LEFT,
} from "../sidebar/main-tree/mainTreeDragGeometry";
import { useSidebarItemHeight } from "../sidebar/hooks/useSidebarItemHeight";
import type { HeadingItem } from "./useHeadings";
import { OutlineHeadingMarker } from "./OutlineHeadingMarker";
import "./outline.css";

const EMPTY_ACTIVE_PATH: readonly string[] = [];

interface OutlinePanelProps {
  headings: HeadingItem[];
  activeId: string | null;
  onHeadingClick: (blockId: string) => void;
  emptyMessage?: string;
  emptyHint?: string | null;
  showBackdrop?: boolean;
}

export function OutlinePanel({
  headings,
  activeId,
  onHeadingClick,
  emptyMessage = uiText("noHeadingsInThisNote"),
  emptyHint = null,
  showBackdrop = true,
}: OutlinePanelProps) {
  useLocale();
  const itemHeight = useSidebarItemHeight();
  const headingPaths = useMemo(() => {
    const paths = new Map<string, readonly string[]>();
    const visit = (items: HeadingItem[], ancestors: readonly string[]) => {
      for (const heading of items) {
        const path = [...ancestors, heading.id];
        paths.set(heading.id, path);
        visit(heading.children, path);
      }
    };
    visit(headings, EMPTY_ACTIVE_PATH);
    return paths;
  }, [headings]);
  const activePath =
    (activeId && headingPaths.get(activeId)) || EMPTY_ACTIVE_PATH;
  const [locallyCollapsedIds, setLocallyCollapsedIds] = useState<Set<string>>(
    () => new Set(),
  );

  const toggleLocalOutline = useCallback((blockId: string) => {
    setLocallyCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });
  }, []);

  if (headings.length === 0) {
    return (
      <section className="outline-panel" aria-label={uiText("documentOutline")}>
        <div className="sidebar-search-heading">
          <strong>{uiText("documentOutline")}</strong>
        </div>
        <div className="outline-empty" role="status">
          {showBackdrop ? <StateArtBackdrop kind="outline" /> : null}
          <OutlineArt className="outline-empty-art" />
          <p>{emptyMessage}</p>
          {emptyHint ? <p className="outline-empty-hint">{emptyHint}</p> : null}
        </div>
      </section>
    );
  }

  return (
    <section className="outline-panel" aria-label={uiText("documentOutline")}>
      <div className="sidebar-search-heading">
        <strong>{uiText("documentOutline")}</strong>
      </div>
      <div className="outline-body">
        <nav>
          {headings.map((heading) => (
            <OutlineTreeNode
              key={heading.id}
              heading={heading}
              depth={0}
              activePath={
                activePath.includes(heading.id) ? activePath : EMPTY_ACTIVE_PATH
              }
              itemHeight={itemHeight}
              locallyCollapsedIds={locallyCollapsedIds}
              onHeadingClick={onHeadingClick}
              onToggleLocalOutline={toggleLocalOutline}
            />
          ))}
        </nav>
      </div>
    </section>
  );
}

const OutlineTreeNode = memo(function OutlineTreeBranch({
  heading,
  depth,
  activePath,
  itemHeight,
  locallyCollapsedIds,
  onHeadingClick,
  onToggleLocalOutline,
}: {
  heading: HeadingItem;
  depth: number;
  activePath: readonly string[];
  itemHeight: number;
  locallyCollapsedIds: Set<string>;
  onHeadingClick: (blockId: string) => void;
  onToggleLocalOutline: (blockId: string) => void;
}) {
  const isOutlineCollapsed = locallyCollapsedIds.has(heading.id);
  return (
    <div>
      <OutlineHeadingRow
        heading={heading}
        depth={depth}
        isActive={activePath.at(-1) === heading.id}
        itemHeight={itemHeight}
        isOutlineCollapsed={isOutlineCollapsed}
        onHeadingClick={onHeadingClick}
        onToggleLocalOutline={onToggleLocalOutline}
      />
      {heading.children.length > 0 && !isOutlineCollapsed ? (
        <div>
          {heading.children.map((child) => (
            <OutlineTreeNode
              key={child.id}
              heading={child}
              depth={depth + 1}
              activePath={
                activePath.includes(child.id) ? activePath : EMPTY_ACTIVE_PATH
              }
              itemHeight={itemHeight}
              locallyCollapsedIds={locallyCollapsedIds}
              onHeadingClick={onHeadingClick}
              onToggleLocalOutline={onToggleLocalOutline}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
});

const OutlineHeadingRow = memo(function OutlineHeadingRow({
  heading,
  depth,
  isActive,
  itemHeight,
  isOutlineCollapsed,
  onHeadingClick,
  onToggleLocalOutline,
}: {
  heading: HeadingItem;
  depth: number;
  isActive: boolean;
  itemHeight: number;
  isOutlineCollapsed: boolean;
  onHeadingClick: (blockId: string) => void;
  onToggleLocalOutline: (blockId: string) => void;
}) {
  useLocale();
  const [hovered, setHovered] = useState(false);
  return (
    <MainTreeRowShell
      active={isActive}
      hovered={!isActive && hovered}
      className="outline-heading-row text-foreground"
      style={
        {
          paddingLeft: depth * MAIN_TREE_INDENT + MAIN_TREE_ROW_PADDING_LEFT,
          "--main-tree-row-height": `${itemHeight}px`,
        } as CSSProperties
      }
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <OutlineHeadingMarker
        level={heading.level}
        expandable={heading.children.length > 0}
        expanded={!isOutlineCollapsed}
        onToggle={() => onToggleLocalOutline(heading.id)}
      />
      <ListRow
        data-goose-row-hover="managed"
        type="button"
        onClick={() => onHeadingClick(heading.id)}
        aria-current={isActive ? "location" : undefined}
        aria-label={uiText("heading", {
          level: heading.level,
          text: heading.text,
        })}
        className={cn(
          "outline-heading relative z-10 min-w-0 flex-1 truncate text-left leading-snug",
        )}
      >
        <span className="block truncate">{heading.text}</span>
      </ListRow>
    </MainTreeRowShell>
  );
});
