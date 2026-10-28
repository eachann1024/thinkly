import { useLocale } from "@/i18n";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";
import {
  ArrowLeftRight,
  ClipboardCopy,
  Copy,
  FileText,
  Pencil,
} from "@/components/ui/icons";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { useEditorPageContext } from "@/components/editor/platform/hostContext";
import { usePages } from "@/stores/usePages";
import { useNotebooks } from "@/stores/useNotebooks";
import { getGooseDesktop } from "@/lib/electron/runtime";
import type {
  BatchPlanOperationInput,
  BatchPlanJournal,
} from "@/lib/notebook-ai/batch-plan/types";
import { planOperationKindLabel } from "../batchPlanDiff";
import { PlanMarkdown } from "../PlanMarkdown";
import {
  originalMarkdown,
  proposedMarkdown,
  operationTargetPage,
  reviewPagePath,
} from "./planReviewData";
import { requestPlanRefinement } from "./refinePlan";
import { ReviewDiff } from "./ReviewDiff";
import messages from "./ReviewOperation.messages.yaml";
import { createTranslator } from "@/i18n";
const t = createTranslator(messages);

export function ReviewOperation({
  operation,
  journal,
  canSelect,
  selected,
  onSelect,
}: {
  operation: BatchPlanOperationInput;
  journal: BatchPlanJournal | null;
  canSelect: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  useLocale();
  const { onOpenPage } = useEditorPageContext();
  const [view, setView] = useState<"diff" | "new">("diff");
  const [copyStatus, setCopyStatus] = useState("");
  const [selectionText, setSelectionText] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);
  const page = operationTargetPage(operation, journal);
  const title =
    operation.type === "create"
      ? operation.title
      : operation.type === "edit" && operation.title
        ? operation.title
        : operation.type === "delete" && operation.pageIds.length > 1
          ? t("detailNotes", { value1: operation.pageIds.length })
          : page
            ? getPageTitle(page)
            : t("theTargetNoteIsNoLongerAvailable");
  const oldText = originalMarkdown(operation, journal);
  const newText = proposedMarkdown(operation, journal);
  const captureSelection = () => {
    const selection = window.getSelection();
    setSelectionText(
      selection &&
        bodyRef.current?.contains(selection.anchorNode) &&
        bodyRef.current?.contains(selection.focusNode)
        ? selection.toString().trim()
        : "",
    );
  };
  const copy = async (text: string, label: string) => {
    try {
      const desktop = getGooseDesktop();
      if (desktop) await desktop.writeText(text);
      else if (navigator.clipboard) await navigator.clipboard.writeText(text);
      else throw new Error(t("clipboardUnavailable"));
      setCopyStatus(t("detailCopied", { value1: label }));
    } catch {
      setCopyStatus(t("copyFailedSelectTheTextAndUseThe"));
    }
  };
  const refine = () => {
    const notebookId =
      journal?.notebookId ??
      page?.workspaceId ??
      useNotebooks.getState().activeNotebookId;
    if (!notebookId || !selectionText) return;
    requestPlanRefinement({
      notebookId,
      text: `请继续调整方案「${journal?.input.title ?? title}」中《${title}》的这段内容（操作 ${operation.operationId}），先生成新的变更方案，等待我确认：\n${selectionText}\n\n我的调整要求：`,
    });
  };
  return (
    <section
      className="notebook-ai-plan-file"
      aria-label={`${planOperationKindLabel(operation.type)} ${title}`}
    >
      {canSelect || newText !== undefined ? (
        <div className="notebook-ai-review-toolbar">
          {canSelect ? (
            <Checkbox
              isSelected={selected}
              onChange={onSelect}
              aria-label={t("detailApply", {
                value1: planOperationKindLabel(operation.type),
                value2: title,
              })}
            >
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
            </Checkbox>
          ) : null}
          {newText !== undefined ? (
            <>
              {oldText !== undefined && operation.type !== "create" ? (
                <div
                  role="group"
                  aria-label={t("detailPreviewModeFor", { value1: title })}
                >
                  <Button
                    contentStyle="preserve"
                    variant="ghost"
                    size={null}
                    type="button"
                    aria-pressed={view === "diff"}
                    className="goose-accent-selection"
                    onClick={() => setView("diff")}
                  >
                    <ArrowLeftRight aria-hidden />
                    {t("diff")}
                  </Button>
                  <Button
                    contentStyle="preserve"
                    variant="ghost"
                    size={null}
                    type="button"
                    aria-pressed={view === "new"}
                    className="goose-accent-selection"
                    onClick={() => setView("new")}
                  >
                    <FileText aria-hidden />
                    {operation.type === "search_replace"
                      ? t("newText")
                      : t("resultingContent")}
                  </Button>
                </div>
              ) : null}
              {oldText !== undefined && operation.type !== "create" ? (
                <Button
                  contentStyle="preserve"
                  variant="ghost"
                  size={null}
                  type="button"
                  onClick={() => void copy(oldText, t("original"))}
                >
                  <Copy aria-hidden />
                  {t("copyOriginal")}
                </Button>
              ) : null}
              <Button
                contentStyle="preserve"
                variant="ghost"
                size={null}
                type="button"
                onClick={() => void copy(newText, t("newContent"))}
              >
                <ClipboardCopy aria-hidden />
                {t("copyNewContent")}
              </Button>
              <Button
                contentStyle="preserve"
                variant="ghost"
                size={null}
                type="button"
                disabled={!selectionText}
                onMouseDown={(event) => event.preventDefault()}
                onClick={refine}
              >
                <Pencil aria-hidden />
                {t("refineSelectedText")}
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
      <p
        className="notebook-ai-review-copy-status"
        role="status"
        aria-live="polite"
      >
        {copyStatus}
      </p>
      <div
        className="notebook-ai-plan-file-body"
        ref={bodyRef}
        onMouseUp={captureSelection}
        onKeyUp={captureSelection}
      >
        {operation.type === "delete" ? (
          <ul className="notebook-ai-plan-delete-list">
            {operation.pageIds.map((id) => {
              const target =
                usePages.getState().pages[id] ?? journal?.before[id]?.page;
              return (
                <li key={id}>
                  {target && !target.trashedAt && !target.isFolder ? (
                    <Button
                      contentStyle="preserve"
                      variant="ghost"
                      size={null}
                      type="button"
                      className="notebook-ai-review-target"
                      title={reviewPagePath(target)}
                      onClick={() => onOpenPage(id)}
                    >
                      {reviewPagePath(target)}
                    </Button>
                  ) : target ? (
                    reviewPagePath(target)
                  ) : (
                    t("theTargetNoteIsNoLongerAvailable")
                  )}
                </li>
              );
            })}
          </ul>
        ) : view === "diff" &&
          oldText !== undefined &&
          operation.type !== "create" ? (
          <ReviewDiff oldText={oldText} newText={newText!} />
        ) : newText ? (
          <PlanMarkdown markdown={newText} />
        ) : (
          <p className="notebook-ai-review-empty">
            {t("thisTextWillBeDeleted")}
          </p>
        )}
      </div>
    </section>
  );
}
