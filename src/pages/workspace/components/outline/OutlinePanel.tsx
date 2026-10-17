import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/outline/OutlinePanel.tsx#localMessages:1">`
zh-Hans:
  collapsedHeading: "H{{level}} {{text}}，已收起"
  heading: "H{{level}} {{text}}"
  noHeadingsInThisNote: "正文暂无标题"
  documentOutline: "文档大纲"
en:
  collapsedHeading: "H{{level}} {{text}}, collapsed"
  heading: "H{{level}} {{text}}"
  noHeadingsInThisNote: "No headings in this note"
  documentOutline: "Document outline"
`;
const uiText = createTranslator(localMessages);
import { ListRow } from "@/components/ui/list-row";
import { useCallback, useState, type CSSProperties } from "react";
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

interface OutlinePanelProps {
  headings: HeadingItem[];
  activeId: string | null;
  onHeadingClick: (blockId: string) => void;
  onHeadingToggle: (blockId: string) => void;
  emptyMessage?: string;
  emptyHint?: string | null;
}

export function OutlinePanel({
  headings,
  activeId,
  onHeadingClick,
  onHeadingToggle,
  emptyMessage = uiText("noHeadingsInThisNote"),
  emptyHint = null,
}: OutlinePanelProps) {
  useLocale();
  const itemHeight = useSidebarItemHeight();
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
        <div className="sidebar-search-heading"><strong>{uiText("documentOutline")}</strong></div>
        <div className="outline-empty" role="status">
          <p>{emptyMessage}</p>
          {emptyHint ? <p className="outline-empty-hint">{emptyHint}</p> : null}
        </div>
      </section>
    );
  }

  return (
    <section className="outline-panel" aria-label={uiText("documentOutline")}>
      <div className="sidebar-search-heading"><strong>{uiText("documentOutline")}</strong></div>
      <div className="outline-body">
        <nav>
          {headings.map((heading) => (
            <OutlineTreeNode
              key={heading.id}
              heading={heading}
              depth={0}
              activeId={activeId}
              itemHeight={itemHeight}
              locallyCollapsedIds={locallyCollapsedIds}
              onHeadingClick={onHeadingClick}
              onHeadingToggle={onHeadingToggle}
              onToggleLocalOutline={toggleLocalOutline}
            />
          ))}
        </nav>
      </div>
    </section>
  );
}

function OutlineTreeNode({
  heading,
  depth,
  activeId,
  itemHeight,
  locallyCollapsedIds,
  onHeadingClick,
  onHeadingToggle,
  onToggleLocalOutline,
}: {
  heading: HeadingItem;
  depth: number;
  activeId: string | null;
  itemHeight: number;
  locallyCollapsedIds: Set<string>;
  onHeadingClick: (blockId: string) => void;
  onHeadingToggle: (blockId: string) => void;
  onToggleLocalOutline: (blockId: string) => void;
}) {
  useLocale();
  const isActive = activeId === heading.id;
  const [hovered, setHovered] = useState(false);
  // 箭头只控制大纲树。正文折叠状态不参与大纲子项的可见性。
  const canToggleOutline = heading.children.length > 0;
  const isEditorCollapsed = heading.isEditorFoldable && heading.isCollapsed;
  const isOutlineCollapsed = locallyCollapsedIds.has(heading.id);
  const toggleOutline = () => onToggleLocalOutline(heading.id);

  return (
    <div>
      <MainTreeRowShell
        active={isActive}
        hovered={!isActive && hovered}
        className="outline-heading-row text-foreground"
        data-collapsed={isEditorCollapsed ? "true" : undefined}
        style={
          {
            paddingLeft: depth * MAIN_TREE_INDENT + MAIN_TREE_ROW_PADDING_LEFT,
            "--main-tree-row-height": `${itemHeight}px`,
          } as CSSProperties
        }
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          // 右键只走编辑器既有的折叠限制；首标题不能折叠时保持无操作，
          // 绝不回退为收起本地大纲子树。
          onHeadingToggle(heading.id);
        }}
      >
        <OutlineHeadingMarker
          level={heading.level}
          expandable={canToggleOutline}
          expanded={!isOutlineCollapsed}
          onToggle={toggleOutline}
        />
        <ListRow
          data-goose-row-hover="managed"
          type="button"
          onClick={() => onHeadingClick(heading.id)}
          aria-current={isActive ? "location" : undefined}
          aria-label={
            uiText(isEditorCollapsed ? "collapsedHeading" : "heading", {level: heading.level, text: heading.text})
          }
          className={cn(
            "outline-heading relative z-10 min-w-0 flex-1 truncate text-left leading-snug",
          )}
        >
          <span className="block truncate">{heading.text}</span>
        </ListRow>
      </MainTreeRowShell>
      {heading.children.length > 0 && !isOutlineCollapsed ? (
        <div>
          {heading.children.map((child) => (
            <OutlineTreeNode
              key={child.id}
              heading={child}
              depth={depth + 1}
              activeId={activeId}
              itemHeight={itemHeight}
              locallyCollapsedIds={locallyCollapsedIds}
              onHeadingClick={onHeadingClick}
              onHeadingToggle={onHeadingToggle}
              onToggleLocalOutline={onToggleLocalOutline}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
