import { Input } from "@/components/editor/ui/input";
import { EditorAction } from "@/components/editor/ui/button";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as GooseIcons from "@/components/ui/icons";
import { cn } from "@/components/editor/utils/cn";
import { formatShortcut } from "@/lib/utils";
import type { BlockNoteEditor } from "@blocknote/core";
import { useEditorUiScale } from "@/components/editor/hooks/useEditorUiScale";
import { getScaledEditorUiPx } from "@/components/editor/utils/editorContextUi";
import {
  clearFind,
  getFindState,
  replaceAllMatches,
  replaceCurrentMatch,
  setFindQuery,
  stepFindMatch,
} from "@/components/editor/find/findInPagePlugin";

type FindInPageBarProps = {
  editor: BlockNoteEditor<any, any, any> | null;
  open: boolean;
  seedQuery?: string;
  openNonce?: number;
  openReplace?: boolean;
  editable?: boolean;
  navigationRequest?: { id: number; direction: "next" | "previous" } | null;
  onClose: () => void;
};

const iconBtnClass =
  "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--goose-control-radius)] disabled:text-disabled";
const iconClass = "block size-[14px] shrink-0";
const inputClass =
  "h-6 min-w-0 w-44 flex-1 border-0 bg-transparent p-0 text-sm leading-6 outline-none placeholder:text-placeholder";

export function FindInPageBar({
  editor,
  open,
  seedQuery = "",
  openNonce = 0,
  openReplace = false,
  editable = true,
  navigationRequest = null,
  onClose,
}: FindInPageBarProps) {
  const editorUiScale = useEditorUiScale();
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [tick, setTick] = useState(0);
  const appliedNonceRef = useRef<number | null>(null);

  if (open && openNonce !== appliedNonceRef.current) {
    appliedNonceRef.current = openNonce;
    if (seedQuery && seedQuery !== query) {
      setQuery(seedQuery);
    }
    if (openReplace) {
      setReplaceOpen(true);
    }
  }

  useEffect(() => {
    if (!open) setReplaceOpen(false);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const focus = () => {
      const target = openReplace ? replaceInputRef.current : inputRef.current;
      target?.focus();
      target?.select();
    };
    if (openReplace && !replaceInputRef.current) {
      queueMicrotask(focus);
      return;
    }
    focus();
  }, [open, openNonce, openReplace]);

  useEffect(() => {
    if (!open || !editor) return;
    setFindQuery(editor, query, caseSensitive);
    setTick((value) => value + 1);
  }, [editor, open, query, caseSensitive]);

  useEffect(() => {
    if (!open && editor) {
      clearFind(editor);
    }
  }, [open, editor]);

  useEffect(() => {
    if (!open || !editor || !navigationRequest) return;
    const state = getFindState(editor);
    if (state?.matches.length) {
      stepFindMatch(editor, navigationRequest.direction === "next" ? 1 : -1);
      setTick((value) => value + 1);
    }
  }, [editor, navigationRequest, open]);

  if (!open) return null;

  const state = editor ? getFindState(editor) : null;
  void tick;
  const total = state?.matches.length ?? 0;
  const currentDisplay = total === 0 ? 0 : (state?.current ?? -1) + 1;
  const canReplace = Boolean(editable && editor && total > 0);
  const offset = getScaledEditorUiPx(8, editorUiScale);

  const handleStep = (delta: number) => {
    if (!editor || total === 0) return;
    stepFindMatch(editor, delta);
    setTick((value) => value + 1);
  };

  const refreshTick = () => setTick((value) => value + 1);

  const handleReplace = () => {
    if (!editor || !canReplace) return;
    replaceCurrentMatch(editor, replacement);
    refreshTick();
  };

  const handleReplaceAll = () => {
    if (!editor || !canReplace) return;
    replaceAllMatches(editor, replacement);
    refreshTick();
  };

  const handleToggleReplace = () => {
    setReplaceOpen((prev) => {
      const next = !prev;
      queueMicrotask(() => {
        const target = next ? replaceInputRef.current : inputRef.current;
        target?.focus();
        target?.select();
      });
      return next;
    });
  };

  return (
    <div
      data-goose-find-in-page
      className="fixed z-[20500]"
      style={{
        right: offset,
        top: `calc(var(--electron-titlebar-height, 2.75rem) + ${offset}px)`,
        maxWidth: `calc(100vw - ${offset * 2}px)`,
      }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="goose-editor-inline-context-ui flex max-w-full items-start gap-1 rounded-md border bg-background/95 px-1 py-1.5 shadow-md backdrop-blur">
        <EditorAction
          type="button"
          aria-expanded={replaceOpen}
          aria-controls={replaceOpen ? "goose-find-replace-row" : undefined}
          aria-label={replaceOpen ? "收起替换" : "展开替换"}
          title={replaceOpen ? "收起替换" : "展开替换"}
          className={iconBtnClass}
          onClick={handleToggleReplace}
        >
          {replaceOpen ? (
            <GooseIcons.ChevronDown className={iconClass} />
          ) : (
            <GooseIcons.ChevronRight className={iconClass} />
          )}
        </EditorAction>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex h-6 min-w-0 items-center gap-1">
            <GooseIcons.Search className={cn(iconClass, "text-muted-foreground")} />
            <Input variant="inline"
              ref={inputRef}
              data-goose-inline-input=""
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleStep(event.shiftKey ? -1 : 1);
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  onClose();
                }
              }}
              placeholder="页内查找"
              aria-label="页内查找"
              className={inputClass}
            />
            <span className="w-14 shrink-0 text-center text-xs tabular-nums text-muted-foreground">
              {currentDisplay}/{total}
            </span>
            <EditorAction
              type="button"
              title={caseSensitive ? "区分大小写：开" : "区分大小写：关"}
              aria-label={caseSensitive ? "区分大小写：开" : "区分大小写：关"}
              aria-pressed={caseSensitive}
              className={cn(
                iconBtnClass,
                caseSensitive &&
                  "bg-[var(--goose-interactive-selected)] text-[var(--goose-interactive-selected-fg)]",
              )}
              onClick={() => setCaseSensitive((value) => !value)}
            >
              <GooseIcons.Replace className={iconClass} />
            </EditorAction>
            <EditorAction
              type="button"
              title={`上一个（${formatShortcut("Shift+Enter")}）`}
              aria-label="上一个匹配"
              className={iconBtnClass}
              disabled={total === 0}
              onClick={() => handleStep(-1)}
            >
              <GooseIcons.ChevronUp className={iconClass} />
            </EditorAction>
            <EditorAction
              type="button"
              title={`下一个（${formatShortcut("Enter")}）`}
              aria-label="下一个匹配"
              className={iconBtnClass}
              disabled={total === 0}
              onClick={() => handleStep(1)}
            >
              <GooseIcons.ChevronDown className={iconClass} />
            </EditorAction>
            <EditorAction
              type="button"
              title={`关闭（${formatShortcut("Esc")}）`}
              aria-label="关闭查找"
              className={iconBtnClass}
              onClick={onClose}
            >
              <GooseIcons.X className={iconClass} />
            </EditorAction>
          </div>
          {replaceOpen ? (
            <div
              id="goose-find-replace-row"
              className="flex h-6 min-w-0 items-center gap-1"
            >
              <GooseIcons.Replace className={cn(iconClass, "text-muted-foreground")} />
              <Input variant="inline"
                ref={replaceInputRef}
                data-goose-inline-input=""
                value={replacement}
                onChange={(event) => setReplacement(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (
                      event.altKey &&
                      (event.metaKey || event.ctrlKey)
                    ) {
                      handleReplaceAll();
                    } else {
                      handleReplace();
                    }
                  } else if (event.key === "Escape") {
                    event.preventDefault();
                    onClose();
                  }
                }}
                placeholder="替换"
                aria-label="替换为"
                className={inputClass}
              />
              <EditorAction
                type="button"
                title="替换"
                aria-label="替换"
                className={iconBtnClass}
                disabled={!canReplace}
                onClick={handleReplace}
              >
                <GooseIcons.Replace className={iconClass} />
              </EditorAction>
              <EditorAction
                type="button"
                title="全部替换"
                aria-label="全部替换"
                className={iconBtnClass}
                disabled={!canReplace}
                onClick={handleReplaceAll}
              >
                <GooseIcons.ReplaceAll className={iconClass} />
              </EditorAction>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
