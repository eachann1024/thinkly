import { useLocale } from "@/i18n";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Check, ClipboardCopy, Copy } from "@/components/ui/icons";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { useEditorPageContext } from "@/components/editor/platform/hostContext";
import { usePages } from "@/stores/usePages";
import { getGooseDesktop } from "@/lib/electron/runtime";
import type {
  BatchPlanOperationInput,
  BatchPlanJournal,
} from "@/lib/notebook-ai/batch-plan/types";
import { diffTextLines, planOperationKindLabel } from "../batchPlanDiff";
import { PlanMarkdown } from "../PlanMarkdown";
import {
  originalMarkdown,
  proposedMarkdown,
  operationTargetPage,
  reviewPagePath,
} from "./planReviewData";
import { ReviewDiff } from "./ReviewDiff";
import { useReviewPages } from "./useReviewPages";
import messages from "./ReviewOperation.messages.yaml";
import { createTranslator } from "@/i18n";
const t = createTranslator(messages);

export const ReviewOperation = memo(function ReviewOperation({
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
  onSelect: (id: string) => void;
}) {
  useLocale();
  const { onOpenPage } = useEditorPageContext();
  const [view, setView] = useState<"new" | "diff">("new");
  const [copied, setCopied] = useState<"original" | "new" | null>(null);
  const [copyError, setCopyError] = useState("");
  const copiedTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(copiedTimer.current), []);
  const notebookMetadata = useReviewPages(operation, journal);
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
  const oldText = useMemo(() => originalMarkdown(operation, journal), [operation, journal]);
  const newText = useMemo(() => proposedMarkdown(operation, journal), [operation, journal, notebookMetadata]);
  const canDiff = oldText !== undefined && newText !== undefined && operation.type !== "create";
  const diffCount = useMemo(() => {
    if (!canDiff) return null;
    const lines = diffTextLines(oldText, newText);
    return {
      add: lines.filter((line) => line.kind === "add").length,
      del: lines.filter((line) => line.kind === "del").length,
    };
  }, [canDiff, oldText, newText]);
  const copy = async (text: string, kind: "original" | "new") => {
    try {
      const desktop = getGooseDesktop();
      if (desktop) await desktop.writeText(text);
      else if (navigator.clipboard) await navigator.clipboard.writeText(text);
      else throw new Error(t("clipboardUnavailable"));
      setCopyError("");
      setCopied(kind);
      window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
      setCopyError(t("copyFailedSelectTheTextAndUseThe"));
    }
  };
  const copyButton = (kind: "original" | "new", text: string) => {
    const done = copied === kind;
    const Icon = done ? Check : kind === "original" ? Copy : ClipboardCopy;
    return (
      <Button
        contentStyle="preserve"
        variant="ghost"
        size={null}
        type="button"
        data-copied={done || undefined}
        onClick={() => void copy(text, kind)}
      >
        <Icon aria-hidden />
        {kind === "original"
          ? done ? t("copiedOriginal") : t("copyOriginal")
          : done ? t("copiedNewContent") : t("copyNewContent")}
      </Button>
    );
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
              onChange={() => onSelect(operation.operationId)}
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
          {canDiff ? (
            <SegmentedControl
              className="notebook-ai-review-view-tabs"
              aria-label={t("detailPreviewModeFor", { value1: title })}
              value={view}
              onValueChange={(next) => setView(next as "new" | "diff")}
              options={[
                {
                  value: "new",
                  label: operation.type === "search_replace" ? t("newText") : t("resultingContent"),
                },
                {
                  value: "diff",
                  label: (
                    <>
                      {t("diff")}
                      {diffCount ? (
                        <span className="notebook-ai-review-diff-count">
                          +{diffCount.add} −{diffCount.del}
                        </span>
                      ) : null}
                    </>
                  ),
                },
              ]}
            />
          ) : null}
          {newText !== undefined ? (
            <div className="notebook-ai-review-copy-actions">
              {canDiff ? copyButton("original", oldText) : null}
              {copyButton("new", newText)}
            </div>
          ) : null}
        </div>
      ) : null}
      <p
        className={copyError ? "notebook-ai-review-copy-status" : "sr-only"}
        role="status"
        aria-live="polite"
      >
        {copyError ||
          (copied ? t("detailCopied", { value1: copied === "original" ? t("original") : t("newContent") }) : "")}
      </p>
      <div className="notebook-ai-plan-file-body">
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
        ) : view === "diff" && canDiff ? (
          <ReviewDiff oldText={oldText} newText={newText} />
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
});
