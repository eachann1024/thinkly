import { memo, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { WebResultLink } from "../ai-cards/WebResultsCard";
import { Check, CircleAlert, Clock3, LoaderCircle, RotateCcw, X } from "@/components/ui/icons";
import type { NotebookAiExecution } from "@/lib/notebook-ai/types";
import { useLocale } from "@/i18n";
import { formatExecutionTime } from "./executionPresentation";
const icons = { running: LoaderCircle, done: Check, error: CircleAlert, waiting: Clock3, approval: Clock3, cancelled: X, undone: RotateCcw };
import type { ProgressStep } from "./toolProgressModel";
import { ToolProgressPages } from "./ToolProgressPages";

const PAGE_SIZE = 32;

const ProgressRow = memo(function ProgressRow({ step, statusLabel, position, total, timing }: {
  step: ProgressStep;
  timing?: { startedAt: number; endedAt?: number };
  position: number;
  total: number;
  statusLabel: (status: ProgressStep["status"]) => string;
}) {
  const locale = useLocale();
  const Icon = icons[step.status];
  return (
    <li aria-posinset={position} aria-setsize={total}>
      <div className="notebook-ai-work-step" data-status={step.status}>
        <span className="notebook-ai-work-step-mark" aria-hidden>
          <Icon size={16} className={step.status === "running" ? "animate-spin motion-reduce:animate-none" : undefined} />
        </span>
        <div className="notebook-ai-work-step-body">
          <div className="notebook-ai-work-step-row">
            <span className="notebook-ai-work-step-label">{step.label}</span>
            <span className={cn("notebook-ai-work-step-st", step.status === "error" && "text-[var(--goose-color-danger-focus)]")}>
              {timing?.endedAt ? `${formatExecutionTime(timing.endedAt - timing.startedAt, locale)} · ` : ""}{statusLabel(step.status)}
            </span>
          </div>
          {step.status === "error" && step.detail ? <p className="notebook-ai-work-step-detail">{step.detail}</p> : null}
          {step.webResults ? (
            <ul className="ai-card-web notebook-ai-work-step-links">
              {step.webResults.results.slice(0, 4).map(result => <WebResultLink key={result.url} result={result} />)}
            </ul>
          ) : null}
        </div>
      </div>
    </li>
  );
});

export const ToolProgressSteps = memo(function ToolProgressSteps({ steps, statusLabel, execution }: {
  steps: ProgressStep[];
  execution?: NotebookAiExecution;
  statusLabel: (status: ProgressStep["status"]) => string;
}) {
  const [requestedPage, setPage] = useState<number | null>(null);
  const pages = Math.max(1, Math.ceil(steps.length / PAGE_SIZE));
  const page = requestedPage === null ? pages - 1 : Math.min(requestedPage, pages - 1);
  const goToPage = (next: number) => setPage(next === pages - 1 ? null : next);
  useEffect(() => {
    if (requestedPage !== null && requestedPage >= pages) setPage(null);
  }, [pages, requestedPage]);
  const start = page * PAGE_SIZE;
  return (
    <div className="notebook-ai-work-step-content">
      <ul className="notebook-ai-work-steps">
        {steps.slice(start, start + PAGE_SIZE).map((step, index) => (
          <ProgressRow key={step.id ?? start + index} step={step} timing={step.id ? execution?.tools[step.id] : undefined} statusLabel={statusLabel} position={start + index + 1} total={steps.length} />
        ))}
      </ul>
      {pages > 1 ? <ToolProgressPages page={page} pages={pages} onPage={goToPage} /> : null}
    </div>
  );
});
