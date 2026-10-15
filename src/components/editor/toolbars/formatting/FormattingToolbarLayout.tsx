import { Fragment, type ReactNode } from "react";
import { TooltipProvider } from "@/components/editor/ui/tooltip";
import { Separator } from "@/components/editor/ui/separator";
import { cn } from "@/components/editor/utils/cn";
import { SelectionToolbarSurface } from "../SelectionToolbarSurface";
import { AiButton } from "./groups/AiButton";
import { AddToChatButton } from "./groups/AddToChatButton";
import { SelectionActions } from "./groups/SelectionActions";
import { SelectionSummary, useSelectionSummary } from "./SelectionSummary";
import { CompactToolbarGroups } from "./CompactToolbarGroups";
import { useToolbarDensity } from "./useToolbarDensity";
import { canShowAddToChatButton } from "@/components/editor/ai/composer/selectionQuote";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { useFormattingToolbarState } from "./useFormattingToolbarState";
import { hasTableMergeAction, TableMergeControls } from "./TableMergeControls";

function ToolbarSectionSeparator() {
  return (
    <Separator
      orientation="vertical"
      className="goose-formatting-toolbar-separator"
    />
  );
}

export function FormattingToolbarLayout({
  state,
}: {
  state: ReturnType<typeof useFormattingToolbarState>;
}) {
  const {
    aiSettings,
    page,
    isQuickNoteSurface,
    selectionState,
    caps,
    aiActive,
    bindTooltip,
    menuRef,
    handleAiActivate,
    shouldHide,
  } = state;
  const density = useToolbarDensity(state.editor, menuRef, isQuickNoteSurface);
  const selectionSummary = useSelectionSummary(caps.mode);
  const isTableSelection = caps.mode === "cellText" || caps.mode === "cellGrid";
  const showAiButton =
    __GOOSE_EDITOR_AI__ &&
    aiSettings.enabled &&
    caps.showAi &&
    !isTableSelection &&
    !isQuickNoteSurface;

  // 分节渲染：仅在「相邻两节都可见」时插入 Separator，避免双分隔线 / 尾随分隔线。
  const sections: ReactNode[] = [];

  if (selectionSummary) {
    sections.push(
      <SelectionSummary key="selection" label={selectionSummary} />,
    );
  }

  if (isTableSelection && hasTableMergeAction(state.editor)) {
    sections.push(<TableMergeControls key="table-merge" editor={state.editor} />);
  }

  if (showAiButton) {
    sections.push(
      <AiButton
        key="ai"
        onActivate={handleAiActivate}
        bindTooltip={bindTooltip}
      />,
    );
  }

  if (
    caps.showMarks ||
    caps.showColors ||
    caps.showLink ||
    caps.showAlign ||
    caps.showClear ||
    (state.listState.show && caps.mode !== "none")
  ) {
    sections.push(
      <CompactToolbarGroups key="formatting" state={state} density={density} />,
    );
  }

  const showAddToChat = canShowAddToChatButton({
    aiEnabled: aiSettings.enabled,
    isCompact: isQuickNoteSurface,
    selectedText: selectionState.selectedQuoteText,
    isImageNodeSelection: selectionState.isImageNodeSelection,
  });

  if (showAddToChat) {
    sections.push(
      <AddToChatButton
        key="add-to-chat"
        selectedText={selectionState.selectedQuoteText}
        pageId={page.id}
        pageTitle={getPageTitle(page)}
        compact={density === "narrow" || density === "minimal"}
      />,
    );
  }

  if (!state.editor.prosemirrorState.selection.empty) {
    sections.push(
      <SelectionActions key="selection-actions" bindTooltip={bindTooltip} />,
    );
  }

  const selectionModeClass =
    caps.mode === "cellText" || caps.mode === "cellGrid"
      ? "goose-formatting-toolbar--cell"
      : caps.mode === "multiBlock"
        ? "goose-formatting-toolbar--multi"
        : undefined;

  return (
    <TooltipProvider
      delayDuration={400}
      skipDelayDuration={0}
      disableHoverableContent
    >
      <SelectionToolbarSurface
        ref={menuRef}
        context={caps.mode}
        variant={isQuickNoteSurface ? "embedded" : "floating"}
        data-formatting-toolbar
        data-selection-mode={caps.mode}
        data-toolbar-density={density}
        data-goose-floating-toolbar={!isQuickNoteSurface ? "true" : undefined}
        onMouseDown={(e) => {
          // Allow native focus on the AI textarea; everything else uses onClick.
          const target = e.target as HTMLElement | null;
          if (!target) return;
          if (target.tagName === "TEXTAREA" || target.tagName === "INPUT")
            return;
          if (target.isContentEditable) return;
          e.preventDefault();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        role="toolbar"
        aria-label="文字格式"
        className={cn(
          // 小窗底栏已用固定 px 尺寸，禁止再套 CSS zoom：
          // Electron 旧内核会放大 zoom 祖先的 getBoundingClientRect，
          // 导致 Portal 色板 / tooltip 错位（只露出「文本颜色」标题）。
          !isQuickNoteSurface && "goose-formatting-toolbar-scaled",
          selectionModeClass,
          "z-[20000] transition-[opacity,transform,width] duration-150 ease-out",
          aiActive ? "w-[520px] max-w-[calc(100vw-24px)]" : "w-auto",
        )}
        style={{
          opacity: shouldHide ? 0 : 1,
          transform: shouldHide ? "scale(0.96)" : "scale(1)",
          pointerEvents: shouldHide ? "none" : "auto",
        }}
      >
        <div className="goose-formatting-toolbar-row">
          {sections.map((section, index) => (
            <Fragment key={index}>
              {index > 0 && <ToolbarSectionSeparator />}
              {section}
            </Fragment>
          ))}
        </div>
      </SelectionToolbarSurface>
    </TooltipProvider>
  );
}
