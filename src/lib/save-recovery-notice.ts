import { createElement, type ComponentProps, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";

interface SaveRecoveryNoticeOptions {
  id: string;
  title: string;
  description?: string;
  retryLabel: string;
  onRetry: () => void | Promise<void>;
  onRetryFailure?: (error: unknown) => string;
  reopenLabel?: string;
  onReopen?: () => void | Promise<void>;
  onReopenFailure?: (error: unknown) => string;
}

const retriesInFlight = new Set<string>();
const reopensInFlight = new Set<string>();
const activeGenerations = new Map<string, number>();
const activeOptions = new Map<string, SaveRecoveryNoticeOptions>();
let nextGeneration = 0;

const formatFailure = (
  format: ((error: unknown) => string) | undefined,
  error: unknown,
  fallback: string | undefined,
) => {
  try {
    return format?.(error) ?? fallback;
  } catch {
    return fallback;
  }
};

export function dismissSaveRecoveryNotice(id: string): void {
  if (!activeGenerations.has(id)) return;
  activeGenerations.delete(id);
  activeOptions.delete(id);
  toast.dismiss(id);
}

function runNoticeAction(id: string, action: "retry" | "reopen") {
  const generation = activeGenerations.get(id);
  const options = activeOptions.get(id);
  const inFlight = action === "retry" ? retriesInFlight : reopensInFlight;
  const callback = action === "retry" ? options?.onRetry : options?.onReopen;
  if (generation === undefined || !options || !callback || inFlight.has(id)) return;
  const isCurrent = () => activeGenerations.get(id) === generation;
  inFlight.add(id);
  void Promise.resolve()
    .then(callback)
    .then(() => {
      if (isCurrent()) dismissSaveRecoveryNotice(id);
    })
    .catch((error: unknown) => {
      if (!isCurrent()) return;
      showSaveRecoveryNotice({
        ...options,
        description: formatFailure(
          action === "retry" ? options.onRetryFailure : options.onReopenFailure,
          error,
          options.description,
        ),
      });
    })
    .finally(() => inFlight.delete(id));
}

export function showSaveRecoveryNotice(options: SaveRecoveryNoticeOptions) {
  const { id, title, description, retryLabel } = options;
  const generation = ++nextGeneration;
  activeGenerations.set(id, generation);
  activeOptions.set(id, options);
  const isCurrent = () => activeGenerations.get(id) === generation;
  const reopenButtonProps: ComponentProps<typeof Button> & {
    "data-button": boolean;
    "data-cancel": boolean;
  } = {
    type: "button",
    variant: "ghost",
    size: "sm",
    "data-button": true,
    "data-cancel": true,
    "aria-label": options.reopenLabel,
    onClick: (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      runNoticeAction(id, "reopen");
    },
  };

  toast.error(title, {
    id,
    duration: Infinity,
    description,
    onDismiss: () => {
      if (isCurrent()) {
        activeGenerations.delete(id);
        activeOptions.delete(id);
      }
    },
    action: {
      label: retryLabel,
      onClick: (event: MouseEvent<HTMLButtonElement>) => {
        // Keep the live toast mounted until the retry settles. Sonner's action
        // callback honors preventDefault; its cancel callback does not.
        event.preventDefault();
        runNoticeAction(id, "retry");
      },
    },
    ...(options.reopenLabel && options.onReopen
      ? {
          cancel: createElement(
            Button,
            { ...reopenButtonProps },
            options.reopenLabel,
          ),
        }
      : {}),
  });
}
