// Shared with the main process: keep this module independent of renderer stores.
export const GOOSE_WINDOW_ID_PREFIX = "--goose-window-id=";
export const GOOSE_WINDOW_KIND_PREFIX = "--goose-window-kind=";

export type GooseWindowKind = "workspace" | "quicknote" | "search";

export function isGooseWindowKind(value: unknown): value is GooseWindowKind {
  return value === "workspace" || value === "quicknote" || value === "search";
}

export type GooseWindowContext = {
  windowId: string;
  kind: GooseWindowKind;
};

export function gooseWindowAdditionalArguments(
  windowId: string,
  kind: GooseWindowKind,
): string[] {
  return [
    `${GOOSE_WINDOW_ID_PREFIX}${windowId}`,
    `${GOOSE_WINDOW_KIND_PREFIX}${kind}`,
  ];
}

export function parseGooseWindowArgs(argv: string[]): GooseWindowContext | null {
  let windowId = "";
  let kind: GooseWindowKind | "" = "";
  for (const arg of argv) {
    if (arg.startsWith(GOOSE_WINDOW_ID_PREFIX)) {
      windowId = arg.slice(GOOSE_WINDOW_ID_PREFIX.length).trim();
    } else if (arg.startsWith(GOOSE_WINDOW_KIND_PREFIX)) {
      const value = arg.slice(GOOSE_WINDOW_KIND_PREFIX.length).trim();
      if (isGooseWindowKind(value)) kind = value;
    }
  }
  if (!windowId || !kind) return null;
  return { windowId, kind };
}

