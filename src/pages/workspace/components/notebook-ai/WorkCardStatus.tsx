import {
  Check,
  CircleAlert,
  Clock3,
  RotateCcw,
  X,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { AiOrbitMark } from "./orbit/AiOrbitMark";
import "./tool-progress.css";

import type { WorkCardStatusData } from "./workCardStatusContext";

const STATUS_ICONS = {
  done: Check,
  error: CircleAlert,
  waiting: Clock3,
  cancelled: X,
  undone: RotateCcw,
};

export function WorkCardStatus({ status }: { status: WorkCardStatusData }) {
  const running = status.icon === "running";
  const Icon = status.icon === "running" ? null : STATUS_ICONS[status.icon];
  return (
    <h3
      className={cn(
        "notebook-ai-work-status",
        `notebook-ai-work-status--${status.tone}`,
        running && "notebook-ai-work-status--running",
      )}
    >
      {running ? <AiOrbitMark variant="run" /> : Icon ? <Icon className="notebook-ai-work-status-icon" aria-hidden /> : null}
      <span>{status.label}</span>
    </h3>
  );
}
