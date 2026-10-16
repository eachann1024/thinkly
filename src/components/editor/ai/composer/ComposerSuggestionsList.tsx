import { EditorAction } from "@/components/editor/ui/button";
import { type RefObject } from "react";
import { createPortal } from "react-dom";
import * as GooseIcons from "@/components/ui/icons";
import { cn } from "@/components/editor/utils/cn";
import type { AiReferenceSuggestionItem } from "@/components/editor/ai/composer/referenceLookup";
import { useCenteredActiveItemScroll } from "@/components/editor/hooks/useCenteredActiveItemScroll";
import { useComposerSuggestionsPosition } from "./useComposerSuggestionsPosition";

interface ComposerSuggestionsListProps {
  items: AiReferenceSuggestionItem[];
  activeIndex: number;
  listKey?: string;
  anchorRect: DOMRect;
  composerRef: RefObject<HTMLDivElement | null>;
  onSelect: (item: AiReferenceSuggestionItem) => void;
  onMouseDownCapture?: () => void;
}

const POPOVER_MIN_WIDTH = 240;
const getMentionItemSelector = (index: number) =>
  `[data-mention-index="${index}"]`;

export function ComposerSuggestionsList({
  items,
  activeIndex,
  listKey,
  anchorRect,
  composerRef,
  onSelect,
  onMouseDownCapture,
}: ComposerSuggestionsListProps) {
  const { floatingRef, style, maxWidth, maxHeight } = useComposerSuggestionsPosition(
    composerRef,
    anchorRect,
    "@",
  );

  const listRef = useCenteredActiveItemScroll<HTMLUListElement>({
    activeIndex,
    itemCount: items.length,
    listKey,
    itemSelector: getMentionItemSelector,
  });

  const popover = (
    <div
      ref={floatingRef}
      data-ai-composer-suggestions="mention"
      style={style}
      onMouseDownCapture={(e) => {
        e.preventDefault();
        onMouseDownCapture?.();
      }}
    >
      <div
        className="goose-menu-surface overflow-hidden"
        style={{
          minWidth: Math.min(POPOVER_MIN_WIDTH, maxWidth),
          maxWidth,
          maxHeight,
        }}
      >
        {items.length === 0 ? (
          <div className="px-3 py-2 text-[12px] text-muted-foreground">
            未找到匹配笔记
          </div>
        ) : (
          <ul
            ref={listRef}
            className="goose-list-layout overflow-y-auto"
            data-goose-menu-slot="root"
            style={{ maxHeight: Math.max(0, maxHeight - 14) }}
          >
            {items.map((item, index) => (
              <li key={item.pageId} data-mention-index={index}>
                <EditorAction
                  type="button"
                  data-goose-menu-slot="row"
                  data-keyboard-active={index === activeIndex || undefined}
                  className={cn(
                    "goose-menu-item goose-menu-item-multiline goose-list-row flex w-full cursor-pointer flex-nowrap items-start gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors",
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(item);
                  }}
                >
                  <span className="flex h-[20px] w-4 shrink-0 items-center justify-center">
                    {item.isFolder ? (
                      <GooseIcons.Folder className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <GooseIcons.FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col justify-start gap-0.5">
                    <div className="truncate goose-menu-title">
                      {item.title}
                    </div>
                    {item.description ? (
                      <div className="truncate goose-menu-description">
                        {item.description}
                      </div>
                    ) : null}
                  </div>
                </EditorAction>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  return createPortal(popover, document.body);
}
