import { isGooseWindowKind, parseGooseWindowArgs, type GooseWindowContext } from "./windowArguments";
export * from "./windowArguments";
import { canTransferDocumentTab } from "../standaloneFileCapabilities";

export const FALLBACK_WINDOW_ID = "main";

export const TABS_PERSIST_KEY_PREFIX = "thinkly:open-tabs:v1";

export type GooseWindowTabSnapshot = {
  id: string;
  pageId: string;
  type?: string;
  workspaceId?: string;
};

export type GooseWindowInitPayload = {
  takeTab?: GooseWindowTabSnapshot;
  restoredTabs?: GooseWindowTabSnapshot[];
};

export type CreateDesktopWindowOpts = {
  mode: "blank" | "currentTab";
  tab?: GooseWindowTabSnapshot;
  bounds?: { x: number; y: number; width: number; height: number };
};

let cachedContext: GooseWindowContext | null = null;
let resolvePromise: Promise<GooseWindowContext> | null = null;
const listeners = new Set<(ctx: GooseWindowContext) => void>();

export function tabsPersistKey(windowId: string): string {
  return `${TABS_PERSIST_KEY_PREFIX}:${windowId}`;
}

function readProcessArgv(): string[] {
  try {
    const argv = (globalThis as { process?: { argv?: unknown } }).process?.argv;
    return Array.isArray(argv)
      ? argv.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export function readWindowContextFromArgv(
  argv: string[] = readProcessArgv(),
): GooseWindowContext | null {
  return parseGooseWindowArgs(argv);
}

export function getWindowId(): string {
  return cachedContext?.windowId ?? FALLBACK_WINDOW_ID;
}

export function getWindowContextSnapshot(): GooseWindowContext {
  return (
    cachedContext ?? {
      windowId: FALLBACK_WINDOW_ID,
      kind: "workspace",
    }
  );
}

export function subscribeWindowContext(
  listener: (ctx: GooseWindowContext) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emitWindowContext(ctx: GooseWindowContext): void {
  cachedContext = ctx;
  listeners.forEach((listener) => listener(ctx));
}

function fallbackContext(): GooseWindowContext {
  return { windowId: FALLBACK_WINDOW_ID, kind: "workspace" };
}

export async function resolveWindowContext(): Promise<GooseWindowContext> {
  if (cachedContext) return cachedContext;
  if (!resolvePromise) {
    resolvePromise = (async () => {
      const fromArgv = readWindowContextFromArgv();
      if (fromArgv) {
        emitWindowContext(fromArgv);
        return fromArgv;
      }
      if (typeof window === "undefined") {
        const fallback = fallbackContext();
        emitWindowContext(fallback);
        return fallback;
      }
      try {
        const ctx = await window.gooseDesktop?.getWindowContext?.();
        const next: GooseWindowContext = ctx?.windowId
          ? {
              windowId: ctx.windowId,
              kind: isGooseWindowKind(ctx.kind) ? ctx.kind : "workspace",
            }
          : fallbackContext();
        emitWindowContext(next);
        return next;
      } catch {
        const fallback = fallbackContext();
        emitWindowContext(fallback);
        return fallback;
      }
    })();
  }
  return resolvePromise;
}

export async function getWindowContext(): Promise<GooseWindowContext> {
  return resolveWindowContext();
}

export async function createDesktopWindow(
  opts: CreateDesktopWindowOpts,
): Promise<{ windowId: string } | null> {
  if (typeof window === "undefined") return null;
  try {
    if (opts.tab && !(await canTransferDocumentTab(opts.tab))) return null;
    const result = await window.gooseDesktop?.createWindow?.(opts);
    return result ?? null;
  } catch {
    return null;
  }
}

export function tabToSnapshot(
  tab: GooseWindowTabSnapshot,
): GooseWindowTabSnapshot {
  const snapshot: GooseWindowTabSnapshot = {
    id: tab.id,
    pageId: tab.pageId,
  };
  if (tab.type) snapshot.type = tab.type;
  if (tab.workspaceId) snapshot.workspaceId = tab.workspaceId;
  return snapshot;
}

export type FinishTabDragResult =
  | { action: "none" }
  | { action: "tearOff"; windowId: string }
  | { action: "docked"; windowId: string };

export async function finishTabDrag(opts: {
  tab: GooseWindowTabSnapshot;
  cursor: { x: number; y: number };
  sourceTabCount: number;
  grabOffsetX?: number;
}): Promise<FinishTabDragResult> {
  if (typeof window === "undefined") return { action: "none" };
  try {
    if (!(await canTransferDocumentTab(opts.tab))) return { action: "none" };
    const result = await window.gooseDesktop?.finishTabDrag?.(opts);
    return result ?? { action: "none" };
  } catch {
    return { action: "none" };
  }
}

export function previewTabDrag(cursor: { x: number; y: number }): void {
  if (typeof window === "undefined") return;
  void window.gooseDesktop?.tabDragMove?.(cursor);
}

export function cancelTabDragPreview(): void {
  if (typeof window === "undefined") return;
  void window.gooseDesktop?.tabDragCancel?.();
}

void resolveWindowContext();
