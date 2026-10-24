import { useCallback, useEffect, useRef, useState } from "react";

export function useCodeBlockEdit({
  block,
  contentRef,
  editor,
  isEditable,
  summary,
  collapsed,
  onDefaultCodeBlockWrapChange,
}: {
  block: any;
  contentRef: any;
  editor: any;
  isEditable: boolean;
  summary: string;
  collapsed: boolean;
  onDefaultCodeBlockWrapChange: (wrap: boolean) => void;
}) {
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState("");
  const [readOnlyCollapsed, setReadOnlyCollapsed] = useState<{
    id: string;
    value: boolean;
  } | null>(null);
  const displayedCollapsed =
    !isEditable && readOnlyCollapsed !== null && readOnlyCollapsed.id === block.id
      ? readOnlyCollapsed.value
      : collapsed;
  const summaryInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const getCodeContent = useCallback(() => {
    const content = block.content;
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content.map((c: any) => c?.text ?? "").join("");
    }
    const el = contentRef.current;
    if (el) return el.textContent || "";
    return "";
  }, [block.content, contentRef]);

  const handleLanguageChange = useCallback(
    (lang: string) => {
      if (!isEditable) return;
      editor.updateBlock(block.id, { props: { language: lang } });
    },
    [editor, block.id, isEditable],
  );

  const handleWrapChange = useCallback(
    (w: boolean) => {
      onDefaultCodeBlockWrapChange(w);
      editor.updateBlock(block.id, { props: { wrap: w } });
    },
    [editor, block.id, onDefaultCodeBlockWrapChange],
  );

  const normalizeSummary = (v: string) => v.replace(/[\r\n]+/g, " ").trim();

  const handleSummaryCommit = useCallback(() => {
    const next = normalizeSummary(summaryDraft);
    if (next !== summary) {
      editor.updateBlock(block.id, { props: { summary: next } });
    }
    setSummaryDraft(next);
    setIsEditingSummary(false);
  }, [summaryDraft, summary, editor, block.id]);

  const handleCollapsedChange = useCallback(() => {
    if (!isEditable) {
      setReadOnlyCollapsed({ id: block.id, value: !displayedCollapsed });
      return;
    }
    editor.updateBlock(block.id, { props: { collapsed: !collapsed } });
  }, [editor, block.id, collapsed, displayedCollapsed, isEditable]);

  const handleFormat = useCallback(
    (formatted: string) => {
      const currentContent = block.content;
      if (Array.isArray(currentContent) && currentContent.length > 0) {
        editor.updateBlock(block.id, {
          content: [{ type: "text", text: formatted, styles: {} }],
        });
      }
    },
    [editor, block.id, block.content],
  );

  useEffect(() => {
    if (!isEditingSummary) return;
    const timer = setTimeout(() => {
      summaryInputRef.current?.focus();
      summaryInputRef.current?.select();
    }, 0);
    return () => clearTimeout(timer);
  }, [isEditingSummary]);

  return {
    rootRef,
    summaryInputRef,
    isEditingSummary,
    setIsEditingSummary,
    summaryDraft,
    setSummaryDraft,
    getCodeContent,
    handleLanguageChange,
    handleWrapChange,
    handleSummaryCommit,
    handleCollapsedChange,
    collapsed: displayedCollapsed,
    handleFormat,
  };
}
