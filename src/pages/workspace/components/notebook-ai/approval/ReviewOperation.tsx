import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useMemo, useRef, useState } from "react";
import { FilePlus2, FileText, Pencil, Trash2 } from "@/components/ui/icons";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { useEditorPageContext } from "@/components/editor/platform/hostContext";
import { usePages } from "@/stores/usePages";
import { useNotebooks } from "@/stores/useNotebooks";
import { getGooseDesktop } from "@/lib/electron/runtime";
import type {
  BatchPlanOperationInput,
  BatchPlanJournal,
} from "@/lib/notebook-ai/batch-plan/types";
import { applySearchReplacePreservingBlocks } from "@/lib/notebook-ai/batch-plan/surgicalApply";
import { diffTextLines, planOperationKindLabel } from "../batchPlanDiff";
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
  resultLabel,
}: {
  operation: BatchPlanOperationInput;
  journal: BatchPlanJournal | null;
  canSelect: boolean;
  selected: boolean;
  onSelect: () => void;
  resultLabel?: string;
}) {
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
  const livePage = page ? usePages.getState().pages[page.id] : undefined;
  const navigable = Boolean(
    livePage && !livePage.trashedAt && !livePage.isFolder,
  );
  const oldText = originalMarkdown(operation, journal);
  const newText = proposedMarkdown(operation, journal);
  const lines =
    oldText !== undefined && newText !== undefined
      ? diffTextLines(oldText, newText)
      : [];
  const added = lines.filter((line) => line.kind === "add").length;
  const deleted = lines.filter((line) => line.kind === "del").length;
  const affectedCount =
    operation.type === "delete"
      ? (journal?.affectedPageIdsByOperationId[operation.operationId]?.length ??
        operation.pageIds.length)
      : undefined;
  const snapshotContent =
    operation.type === "search_replace"
      ? journal?.before[operation.pageId]?.page.content
      : undefined;
  const replacementPreview = useMemo(
    () =>
      operation.type === "search_replace" && snapshotContent
        ? applySearchReplacePreservingBlocks(
            snapshotContent,
            operation.oldString,
            operation.newString,
            { replaceAll: operation.replaceAll },
          )
        : undefined,
    [operation, snapshotContent],
  );
  const scope =
    operation.type === "search_replace"
      ? `${operation.replaceAll ? t("replaceAllMatches") : t("replaceFirstMatch")}${replacementPreview?.ok ? t("matchCount", { count: replacementPreview.replacedCount }) : ""}`
      : operation.type === "edit"
        ? t("replaceEntireNoteBody")
        : operation.type === "delete"
          ? t("detailMoveNotesToTrashIncludingChildNotes", { value1: affectedCount ?? operation.pageIds.length })
          : t("createNote");
  const path = page
    ? reviewPagePath(page)
    : operation.type === "create"
      ? (journal?.plannedLocalPaths[operation.operationId] ??
        (operation.parentId
          ? `${usePages.getState().pages[operation.parentId] ? reviewPagePath(usePages.getState().pages[operation.parentId]!) : t("targetParent")} / ${title}`
          : `${journal ? (useNotebooks.getState().notebooks[journal.notebookId]?.name ?? "") : ""} / ${title}`))
      : "";
  const Icon =
    operation.type === "create"
      ? FilePlus2
      : operation.type === "delete"
        ? Trash2
        : operation.type === "search_replace"
          ? Pencil
          : FileText;
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
      <div className="notebook-ai-plan-file-bar">
        {canSelect ? (
          <Checkbox
            isSelected={selected}
            onChange={onSelect}
            aria-label={t("detailApply", { value1: planOperationKindLabel(operation.type), value2: title })}
          >
            <Checkbox.Control><Checkbox.Indicator /></Checkbox.Control>
          </Checkbox>
        ) : (
          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        )}
        <span className="notebook-ai-plan-file-kind">
          {planOperationKindLabel(operation.type)}
        </span>
        {navigable ? (
          <Button contentStyle="preserve" variant="ghost" size={null}
            type="button"
            className="notebook-ai-plan-file-title notebook-ai-review-target"
            title={t("detailOpenTargetNote", { value1: path })}
            onClick={() => onOpenPage(livePage!.id)}
          >
            {title}
          </Button>
        ) : (
          <span className="notebook-ai-plan-file-title">{title}</span>
        )}
        {resultLabel ? (
          <span className="notebook-ai-review-result">{resultLabel}</span>
        ) : null}
      </div>
      <div className="notebook-ai-review-meta">
        <span title={path}>{path}</span>
        <span>
          {scope}
          {lines.length ? t("detailLines", { value1: added, value2: deleted }) : ""}
        </span>
      </div>
      {newText !== undefined ? (
        <div className="notebook-ai-review-toolbar">
          {oldText !== undefined && operation.type !== "create" ? (
            <div role="group" aria-label={t("detailPreviewModeFor", { value1: title })}>
              <Button contentStyle="preserve" variant="ghost" size={null}
                type="button"
                aria-pressed={view === "diff"}
                className="goose-accent-selection"
                onClick={() => setView("diff")}
              >
                {t("diff")}
              </Button>
              <Button contentStyle="preserve" variant="ghost" size={null}
                type="button"
                aria-pressed={view === "new"}
                className="goose-accent-selection"
                onClick={() => setView("new")}
              >
                {operation.type === "search_replace" ? t("newText") : t("resultingContent")}
              </Button>
            </div>
          ) : null}
          {oldText !== undefined && operation.type !== "create" ? (
            <Button contentStyle="preserve" variant="ghost" size={null} type="button" onClick={() => void copy(oldText, t("original"))}>
              {t("copyOriginal")}
            </Button>
          ) : null}
          <Button contentStyle="preserve" variant="ghost" size={null} type="button" onClick={() => void copy(newText, t("newContent"))}>
            {t("copyNewContent")}
          </Button>
          <Button contentStyle="preserve" variant="ghost" size={null}
            type="button"
            disabled={!selectionText}
            onMouseDown={(event) => event.preventDefault()}
            onClick={refine}
          >
            {t("refineSelectedText")}
          </Button>
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
                    <Button contentStyle="preserve" variant="ghost" size={null}
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
          <p className="notebook-ai-review-empty">{t("thisTextWillBeDeleted")}</p>
        )}
      </div>
    </section>
  );
}
