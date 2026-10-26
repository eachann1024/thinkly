import { Check, Loader2, RotateCcw, CircleAlert, Clock3, X } from "@/components/ui/icons";
import type { WorkCardStatusData } from "../workCardStatusContext";

export function ReviewActionStatus({ status }: { status: WorkCardStatusData }) {
  const running = status.icon === "running";
  const Icon = running ? Loader2 : status.icon === "done" ? Check :
    status.icon === "undone" ? RotateCcw : status.icon === "error" ? CircleAlert :
    status.icon === "waiting" ? Clock3 : X;
  return (
    <div className="notebook-ai-review-action-status" data-tone={status.tone}
      role="status" aria-live="polite" aria-atomic="true">
      {Icon ? <Icon className={running ? "animate-spin motion-reduce:animate-none" : undefined} /> : null}
      <span>{status.label}</span>
    </div>
  );
}
