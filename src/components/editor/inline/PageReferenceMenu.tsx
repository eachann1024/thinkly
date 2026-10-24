import { forwardRef } from "react";
import { FileText } from "@/components/ui/icons";
import { EditorAction } from "../ui/button";
import { useCustomSlashNavigation } from "../core/useCustomSlashNavigation";
import { isSlashMenuDivider, type SlashMenuItem } from "../core/blocknoteSlashItems";
import "./page-reference.css";

interface PageReferenceMenuProps {
  items: SlashMenuItem[];
  loadingState: "loading-initial" | "loading" | "loaded";
  selectedIndex: number | undefined;
  onItemClick?: (item: SlashMenuItem) => void;
}

export const PageReferenceMenu = forwardRef<HTMLDivElement, PageReferenceMenuProps>(
  ({ items, selectedIndex: externalIndex, onItemClick }, ref) => {
    const { selectedIndex, setSelectedIndex, containerRef, suppressItemHover,
      ignoreMouseEnterUntilRef, selectItem } = useCustomSlashNavigation(items, externalIndex, onItemClick);
    if (!items.length) return null;
    return (
      <div ref={ref} data-goose-page-reference-menu="" data-notion-slash-root="true">
        <div className="goose-menu-surface" data-notion-slash-surface="true">
          <div ref={containerRef} className="goose-page-reference-scroll" data-hover-suppressed={suppressItemHover || undefined}>
            <div className="goose-list-layout" data-goose-menu-slot="root" role="menu">
              {items.map((item, index) => !isSlashMenuDivider(item) && (
                <EditorAction
                  key={`${index}:${item.title}`} type="button" role="menuitem"
                  data-index={index} data-goose-menu-slot="row"
                  data-keyboard-active={index === selectedIndex || undefined}
                  disabled={item.disabled}
                  title={item.disabledReason || item.description || item.title}
                  aria-label={item.description ? `${item.title} · ${item.description}` : item.title}
                  className="goose-menu-item goose-list-row goose-accent-selection goose-page-reference-row"
                  onMouseEnter={() => {
                    if (!suppressItemHover && Date.now() >= ignoreMouseEnterUntilRef.current) setSelectedIndex(index);
                  }}
                  onClick={() => selectItem(index)}
                >
                  <span className="goose-page-reference-icon" aria-hidden="true">{item.icon ?? <FileText size={16} />}</span>
                  <span className="goose-page-reference-title">{item.title}</span>
                </EditorAction>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  },
);
PageReferenceMenu.displayName = "PageReferenceMenu";
