import { useSettings } from "@/stores/useSettings";

export type NotebookAiRuntime = "legacy" | "pi";

const RUNTIME_STORAGE_KEY = "thinkly-ai-runtime";

export function resolveNotebookAiRuntime(): NotebookAiRuntime {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(RUNTIME_STORAGE_KEY)?.trim();
      if (raw === "legacy" || raw === "pi") return raw;
    } catch {
    }
  }

  const fromSettings = useSettings.getState().ai.runtime;
  if (fromSettings === "legacy" || fromSettings === "pi") {
    return fromSettings;
  }
  return "pi";
}

export function setNotebookAiRuntimeOverride(
  runtime: NotebookAiRuntime | null,
): void {
  if (typeof window === "undefined") return;
  try {
    if (!runtime) {
      window.localStorage.removeItem(RUNTIME_STORAGE_KEY);
    } else {
      window.localStorage.setItem(RUNTIME_STORAGE_KEY, runtime);
    }
  } catch {
  }
}
