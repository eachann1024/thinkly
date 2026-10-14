import {
  useBlockNoteEditor,
  useEditorState,
  useExtension,
} from "@blocknote/react";
import { AIExtension } from "@blocknote/xl-ai";
import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { TooltipProvider } from "@/components/editor/ui/tooltip";
import { Separator } from "@/components/editor/ui/separator";
import { cn } from "@/components/editor/utils/cn";
import {
  useEditorPageContext,
  useEditorSettings,
} from "@/components/editor/platform/hostContext";
import { useContextMenu } from "@/components/editor/state/contextMenu";
import { useGlobalScrollActivity } from "@/components/editor/hooks/useGlobalScrollActivity";
import { useFormattingToolbarAi } from "@/components/editor/state/formattingToolbarAi";
import { useFormattingToolbarHold } from "@/components/editor/state/formattingToolbarHold";
import { FormattingToolbarColorPicker } from "@/components/editor/toolbars/formatting/ColorPicker";
import { setFakeSelection } from "@/components/editor/extensions/fakeSelectionExtension";
import {
  applySelectionTextAlignment,
  clearSelectionFormatting,
  expandCollapsedSelectionToLine,
  getCollapsedLineRange,
  getFixedFormattingToolbarCapabilities,
  getFormattingToolbarCapabilities,
  resolveFormattingToolbarAiBlockId,
  selectionDisallowsFormattingToolbar,
  selectionIsInsideFirstTitleBlock,
  selectionIsInsideHeadingBlock,
  shouldRenderFormattingToolbar,
  useSelectionMarkStates,
} from "@/components/editor/toolbars/formatting/helpers";
import type { BindTooltip } from "@/components/editor/toolbars/formatting/ToolbarTooltip";
import { AiButton } from "@/components/editor/toolbars/formatting/groups/AiButton";
import { AddToChatButton } from "@/components/editor/toolbars/formatting/groups/AddToChatButton";
import { toast } from "@/components/ui/sonner";
import { getCustomAIApiKey } from "@/lib/ai-provider";
import { MarkGroup } from "@/components/editor/toolbars/formatting/groups/MarkGroup";
import { InlineGroup } from "@/components/editor/toolbars/formatting/groups/InlineGroup";
import { LinkButton } from "@/components/editor/toolbars/formatting/groups/LinkButton";
import { AlignGroup } from "@/components/editor/toolbars/formatting/groups/AlignGroup";
import { ListTypeGroup } from "@/components/editor/toolbars/formatting/groups/ListTypeGroup";
import { ClearFormatButton } from "@/components/editor/toolbars/formatting/groups/ClearFormatButton";
import { getListTypeToolbarState } from "@/components/editor/toolbars/formatting/listType";
import { canShowAddToChatButton } from "@/components/editor/ai/composer/selectionQuote";
import { getSelectedImageUrl } from "@/components/editor/utils/selection";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { isQuickNoteEditorPage } from "@/pages/workspace/components/editor-host/editorContentMode";

export { shouldRenderFormattingToolbar };

function ToolbarSectionSeparator() {
  return (
    <Separator
      orientation="vertical"
      className="goose-formatting-toolbar-separator"
    />
  );
}

/** 固定工具栏不隐藏分组，不可用时整组置灰，避免按钮随光标跳位。 */
function ToolbarSection({
  disabled,
  children,
}: {
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <fieldset
      disabled={disabled}
      aria-disabled={disabled || undefined}
      className="goose-formatting-toolbar-section"
    >
      {children}
    </fieldset>
  );
}

export function EditorFormattingToolbar() {
  return <FormattingToolbarView variant="floating" />;
}

/** 常驻顶部的格式工具栏：折叠光标按整行处理，不可用分组置灰。 */
export function FixedEditorFormattingToolbar() {
  return <FormattingToolbarView variant="fixed" />;
}

function FormattingToolbarView({
  variant,
}: {
  variant: "floating" | "fixed";
}) {
  const fixed = variant === "fixed";
  const editor = useBlockNoteEditor();
  // 未启用 AI 的构建跳过 useExtension；编译期分支在同一构建内保持稳定。

  const aiExtension = __GOOSE_EDITOR_AI__
    ? useExtension(AIExtension)
    : undefined;
  const { ai: aiSettings } = useEditorSettings();
  const { contentMode, page } = useEditorPageContext();
  const protectsFirstTitle = contentMode === "normalized";
  // Electron 桌面端与主窗共用构建，COMPACT / LITE 恒为 false，必须看运行时草稿页。
  const isQuickNoteSurface =
    __GOOSE_EDITOR_COMPACT__ ||
    __GOOSE_LITE__ ||
    isQuickNoteEditorPage(page);
  const markStates = useSelectionMarkStates(editor);

  const selectionState = useEditorState({
    editor,
    selector: ({ editor }) => {
      const { selection, doc } = editor.prosemirrorState;

      const selectedText = doc
        .textBetween(selection.from, selection.to, "\n", "\n")
        .trim();
      let quoteText: string;
      try {
        quoteText = (editor.getSelectedText() ?? "").trim();
      } catch {
        quoteText = selectedText;
      }
      const lineRange = getCollapsedLineRange(editor.prosemirrorState);
      const lineText = lineRange
        ? doc.textBetween(lineRange.from, lineRange.to, "\n", "\n").trim()
        : "";

      return {
        lineText,
        hasTextSelection:
          (!selection.empty && selectedText.length > 0) ||
          shouldRenderFormattingToolbar(editor),
        disallowsFormattingToolbar: selectionDisallowsFormattingToolbar(editor),
        selectedQuoteText: quoteText,
        isImageNodeSelection:
          getSelectedImageUrl(editor.prosemirrorState) != null,
      };
    },
  });

  // 仅 normalized 文档把物理首块 H1 视为受保护的页面标题。
  const isInTitleOne = useEditorState({
    editor,
    selector: ({ editor }) =>
      protectsFirstTitle && selectionIsInsideFirstTitleBlock(editor),
  });

  const caps = useEditorState({
    editor,
    selector: ({ editor }) =>
      (fixed
        ? getFixedFormattingToolbarCapabilities
        : getFormattingToolbarCapabilities)(editor, {
        isInHeading: selectionIsInsideHeadingBlock(editor),
      }),
  });

  const holdDuringPointerSelect = useFormattingToolbarHold();
  const aiActive = useFormattingToolbarAi((s) => s.active);
  const activateFormattingToolbarAi = useFormattingToolbarAi(
    (state) => state.activate,
  );
  const resetFormattingToolbarAi = useFormattingToolbarAi(
    (state) => state.reset,
  );

  const openMenuId = useContextMenu((state) => state.openMenuId);
  const isContextMenuOpen = Boolean(openMenuId);
  const scrollActivity = useGlobalScrollActivity({ idleMs: 120 });
  const isScrolling = scrollActivity.isScrolling;

  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const bindTooltip = useCallback<BindTooltip>(
    (id) => ({
      delayDuration: 400,
      open: activeTooltip === id,
      onOpenChange: (open) =>
        setActiveTooltip((prev) => (open ? id : prev === id ? null : prev)),
    }),
    [activeTooltip],
  );

  useEffect(() => {
    if (!menuRef.current) return;
    menuRef.current.style.zIndex = "20000";
  }, []);

  useEffect(() => {
    if (!isScrolling && !isContextMenuOpen) return;
    setActiveTooltip(null);
  }, [isScrolling, isContextMenuOpen]);

  // xl-ai 接管：旧自家 AiPanel 不再触发，AI 按钮改为打开 xl-ai 的 AIMenu。
  // 保存 selection 作为 AI 浮层锚点，并在菜单生命周期内隐藏格式工具栏。
  const handleAiActivate = useCallback(() => {
    try {
      if (
        editor.prosemirrorState.selection.empty &&
        !(fixed && getCollapsedLineRange(editor.prosemirrorState))
      ) {
        return;
      }

      if (!aiSettings.enabled) {
        toast.error("AI 助手尚未开启，请先到设置中打开");
        return;
      }
      const apiKey = getCustomAIApiKey(aiSettings);
      if (!apiKey) {
        toast.error(
          '未填写 API Key。请前往"设置 → AI 助手 → AI 服务"检查配置。',
        );
        return;
      }
      const hasModel =
        aiSettings.selectedModelId?.trim() ||
        aiSettings.customModelOptions[0]?.id;
      if (!hasModel) {
        toast.error("请先保存 AI 服务配置并获取模型列表");
        return;
      }

      // 固定工具栏在折叠光标下按整行交给 AI。
      if (fixed) expandCollapsedSelectionToLine(editor);
      const { selection } = editor.prosemirrorState;
      const saved = { from: selection.from, to: selection.to };
      setFakeSelection(editor, saved);
      activateFormattingToolbarAi(saved);

      const blockId = resolveFormattingToolbarAiBlockId(editor);
      if (!blockId) {
        setFakeSelection(editor, null);
        resetFormattingToolbarAi();
        toast.error("无法定位当前选区，请重新选中表格或文字后再试");
        return;
      }
      setActiveTooltip(null);
      aiExtension?.openAIMenuAtBlock(blockId);
    } catch {
      try {
        setFakeSelection(editor, null);
      } catch {
        /* ignore */
      }
      resetFormattingToolbarAi();
    }
  }, [
    activateFormattingToolbarAi,
    aiExtension,
    aiSettings,
    editor,
    fixed,
    resetFormattingToolbarAi,
  ]);

  const isBold = markStates.bold;
  const isItalic = markStates.italic;
  const isStrike = markStates.strike;
  const isUnderline = markStates.underline;
  const isCode = markStates.code;

  const textAlignment = caps.textAlignment;
  const listState = useEditorState({
    editor,
    selector: ({ editor }) => getListTypeToolbarState(editor),
  });

  const linkUrl = caps.showLink ? editor.getSelectedLinkUrl() : undefined;
  const isLinkActive = !!linkUrl;

  const setTextAlignment = useCallback(
    (alignment: "left" | "center" | "right") => {
      applySelectionTextAlignment(editor, alignment);
    },
    [editor],
  );

  const clearFormatting = useCallback(() => {
    clearSelectionFormatting(editor);
  }, [editor]);

  // 小窗的格式栏是固定底栏，滚动不会遮挡选区，也不应闪烁隐藏；
  // 常规笔记本的浮动栏仍在滚动时收起，避免与正文一起漂移。
  const shouldHideForScroll =
    !fixed && ((!isQuickNoteSurface && isScrolling) || isContextMenuOpen);
  // While AI is active we keep the toolbar visible regardless of scroll/menu.
  const shouldHide = !aiActive && !colorPickerOpen && shouldHideForScroll;

  if (!editor.isEditable) return null;

  // Selection-based gating only matters when AI mode isn't already active.
  // 拖选按住期间选区会先塌成空：不要卸掉工具栏，否则被挡住的上一行会闪一下。
  if (
    !fixed &&
    !aiActive &&
    !colorPickerOpen &&
    !holdDuringPointerSelect &&
    (!selectionState.hasTextSelection ||
      selectionState.disallowsFormattingToolbar ||
      isInTitleOne)
  ) {
    return null;
  }

  // 固定工具栏：受保护标题内整条置灰；其余按能力逐组置灰。
  const lockAll = fixed && isInTitleOne;
  const sectionFor = (key: string, enabled: boolean, node: ReactNode) =>
    fixed ? (
      <ToolbarSection key={key} disabled={lockAll || !enabled}>
        {node}
      </ToolbarSection>
    ) : (
      <Fragment key={key}>{node}</Fragment>
    );

  const aiAvailable =
    __GOOSE_EDITOR_AI__ && aiSettings.enabled && !isQuickNoteSurface;
  const showAiButton = aiAvailable && caps.showAi;

  // 分节渲染：仅在「相邻两节都可见」时插入 Separator，避免双分隔线 / 尾随分隔线。
  const sections: ReactNode[] = [];

  if (fixed ? aiAvailable : showAiButton) {
    sections.push(
      sectionFor(
        "ai",
        caps.showAi,
        <AiButton onActivate={handleAiActivate} bindTooltip={bindTooltip} />,
      ),
    );
  }

  const markNodes = (
    <>
      <MarkGroup
        isBold={isBold}
        isItalic={isItalic}
        isStrike={isStrike}
        bindTooltip={bindTooltip}
      />
      <InlineGroup
        isUnderline={isUnderline}
        isCode={isCode}
        bindTooltip={bindTooltip}
      />
    </>
  );
  const colorNode = (
    <FormattingToolbarColorPicker onOpenChange={setColorPickerOpen} />
  );

  if (fixed) {
    sections.push(
      <Fragment key="styles">
        {sectionFor("marks", caps.showMarks, markNodes)}
        {sectionFor("colors", caps.showColors, colorNode)}
      </Fragment>,
    );
  } else if (caps.showMarks || caps.showColors) {
    sections.push(
      <Fragment key="styles">
        {caps.showMarks && markNodes}
        {caps.showColors && colorNode}
      </Fragment>,
    );
  }

  if (fixed || caps.showLink) {
    sections.push(
      sectionFor(
        "link",
        caps.showLink,
        <LinkButton
          isLinkActive={isLinkActive}
          linkUrl={linkUrl}
          bindTooltip={bindTooltip}
        />,
      ),
    );
  }

  if (fixed || caps.showAlign) {
    sections.push(
      sectionFor(
        "align",
        caps.showAlign,
        <AlignGroup
          textAlignment={textAlignment}
          setTextAlignment={setTextAlignment}
          bindTooltip={bindTooltip}
        />,
      ),
    );
  }

  const showList =
    listState.show &&
    caps.mode !== "none" &&
    caps.mode !== "cellText" &&
    caps.mode !== "cellGrid";

  if (fixed || showList) {
    sections.push(
      sectionFor(
        "list-type",
        showList,
        <ListTypeGroup bindTooltip={bindTooltip} />,
      ),
    );
  }

  if (fixed || caps.showClear) {
    sections.push(
      sectionFor(
        "clear",
        caps.showClear,
        <ClearFormatButton onClear={clearFormatting} bindTooltip={bindTooltip} />,
      ),
    );
  }

  const quoteText =
    selectionState.selectedQuoteText || (fixed ? selectionState.lineText : "");
  const showAddToChat = canShowAddToChatButton({
    aiEnabled: aiSettings.enabled,
    isCompact: isQuickNoteSurface,
    selectedText: quoteText,
    isImageNodeSelection: selectionState.isImageNodeSelection,
  });

  if (fixed ? aiAvailable : showAddToChat) {
    sections.push(
      sectionFor(
        "add-to-chat",
        showAddToChat,
        <AddToChatButton
          selectedText={quoteText}
          pageId={page.id}
          pageTitle={getPageTitle(page)}
        />,
      ),
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
      <div
        ref={menuRef}
        data-formatting-toolbar
        data-selection-mode={caps.mode}
        data-goose-floating-toolbar={
          !fixed && !isQuickNoteSurface ? "true" : undefined
        }
        data-goose-fixed-toolbar={fixed ? "true" : undefined}
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
          !fixed && !isQuickNoteSurface && "goose-formatting-toolbar-scaled",
          selectionModeClass,
          fixed
            ? "w-full"
            : cn(
                "z-[20000] transition-[opacity,transform,width] duration-150 ease-out",
                aiActive ? "w-[520px] max-w-[calc(100vw-24px)]" : "w-auto",
              ),
        )}
        style={
          fixed
            ? undefined
            : {
                opacity: shouldHide ? 0 : 1,
                transform: shouldHide ? "scale(0.96)" : "scale(1)",
                pointerEvents: shouldHide ? "none" : "auto",
              }
        }
      >
        <div className="goose-formatting-toolbar-row">
          {sections.map((section, index) => (
            <Fragment key={index}>
              {index > 0 && <ToolbarSectionSeparator />}
              {section}
            </Fragment>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
