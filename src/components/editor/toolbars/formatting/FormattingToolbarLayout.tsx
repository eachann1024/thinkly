import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/editor/ui/tooltip";
import { cn } from "@/components/editor/utils/cn";
import { SelectionToolbarSurface } from "../SelectionToolbarSurface";
import { AddToChatButton } from "./groups/AddToChatButton";
import { FormattingToolbarGroups } from "./FormattingToolbarGroups";
import { canShowAddToChatButton } from "@/components/editor/ai/composer/selectionQuote";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { useFormattingToolbarState } from "./useFormattingToolbarState";
import { hasTableMergeAction, TableMergeControls } from "./TableMergeControls";
import { useToolbarHorizontalScroll } from "./useToolbarHorizontalScroll";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/toolbars/formatting/FormattingToolbarLayout.tsx#messages:1">`
zh-Hans:
  textFormatting: "文字格式"
en:
  textFormatting: "Text formatting"
ja:
  textFormatting: "文字書式"
`;
const t = createTranslator(messages);


export function FormattingToolbarLayout({
  state,
}: {
  state: ReturnType<typeof useFormattingToolbarState>;
}) {
  useLocale();
  const {
    aiSettings,
    page,
    isQuickNoteSurface,
    selectionState,
    caps,
    aiActive,
    menuRef,
    shouldHide,
  } = state;
  const rowRef = useToolbarHorizontalScroll(true);
  const isTableSelection = caps.mode === "cellText" || caps.mode === "cellGrid";
  // 选区 AI 润色入口暂时停用；加入对话继续使用独立入口。
  const sections: ReactNode[] = [];

  if (isTableSelection && hasTableMergeAction(state.editor)) {
    sections.push(<TableMergeControls key="table-merge" editor={state.editor} />);
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
      <FormattingToolbarGroups key="formatting" state={state} />,
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
        bindTooltip={state.bindTooltip}
        selectedText={selectionState.selectedQuoteText}
        pageId={page.id}
        pageTitle={getPageTitle(page)}
      />,
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
        aria-label={t("textFormatting")}
        className={cn(
          // 小窗底栏已用固定 px 尺寸，禁止再套 CSS zoom：
          // Electron 旧内核会放大 zoom 祖先的 getBoundingClientRect，
          // 导致 Portal 色板 / tooltip 错位（只露出「文本颜色」标题）。
          !isQuickNoteSurface && "goose-formatting-toolbar-scaled",
          selectionModeClass,
          "transition-[opacity,transform,width] duration-150 ease-out",
          aiActive ? "w-[520px] max-w-[calc(100vw-24px)]" : "w-auto",
        )}
        style={{
          opacity: shouldHide ? 0 : 1,
          transform: shouldHide ? "scale(0.96)" : "scale(1)",
          pointerEvents: shouldHide ? "none" : "auto",
        }}
      >
        <div ref={rowRef} className="goose-formatting-toolbar-row">
          {sections}
        </div>
      </SelectionToolbarSurface>
    </TooltipProvider>
  );
}
