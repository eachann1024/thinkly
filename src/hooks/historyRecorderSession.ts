import type { Page } from "@/types";
import type { BlockNoteContent } from "@/components/editor/utils/blocknote-content";
import { getContentDerivations } from "@/lib/reflection/contentDerivations";
import { getHistoryContentSignature } from "@/lib/history/contentSignature";
import { getPageHistorySettings } from "@/lib/history/settings";
import { recordHistorySnapshotDetailed } from "@/lib/history/snapshot";
import { useAiStatus } from "@/stores/useAiStatus";
import { useHistoryView } from "@/stores/useHistoryView";

const IDLE_MS = 15_000;
const HEARTBEAT_MS = 30_000;
const CHAR_THRESHOLD = 200;

interface Candidate {
  content: BlockNoteContent;
  settings: string;
}

function fingerprint(candidate: Candidate): string {
  return `${getHistoryContentSignature(candidate.content)}:${candidate.settings}`;
}

function wordCount(candidate: Candidate): number {
  return getContentDerivations(candidate.content).wordCount;
}

/** A subscription session owns one active page, without a React render per edit. */
export function createHistoryRecorderSession(pageId: string, workspaceId: string) {
  let baseline: Candidate | null = null;
  let pending: Candidate | null = null;
  let observed: Candidate | null = null;
  let observedUpdatedAt: number | undefined;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let recording = false;
  let disposed = false;

  const clearIdle = () => {
    if (idleTimer !== undefined) clearTimeout(idleTimer);
    idleTimer = undefined;
  };

  const tryFire = () => {
    if (disposed || recording || !pending || !baseline) return;
    // Streaming never takes a candidate snapshot, so it need not fingerprint.
    if (useAiStatus.getState().phase === "streaming") return;
    const candidate = pending;
    if (fingerprint(candidate) === fingerprint(baseline)) {
      pending = null;
      clearIdle();
      return;
    }

    recording = true;
    recordHistorySnapshotDetailed({
      pageId,
      workspaceId,
      content: candidate.content,
      trigger: "idle",
    })
      .then(result => {
        if (disposed) return;
        if (result.status === "rate-limited") {
          if (pending) {
            clearIdle();
            idleTimer = setTimeout(tryFire, Math.max(0, result.retryAt - Date.now()));
          }
          return;
        }
        if (pending === candidate) pending = null;
        baseline = candidate;
        if (result.status === "created" || result.status === "updated") {
          const view = useHistoryView.getState();
          if (view.active === pageId) view.bumpRefresh();
        }
      })
      .catch(error => console.error("[history] recordHistorySnapshot failed:", error))
      .finally(() => { if (!disposed) recording = false; });
  };

  const heartbeat = setInterval(tryFire, HEARTBEAT_MS);

  return {
    observe(page: Page): void {
      if (disposed || page.isFolder || page.localReadState === "error" || !page.content) return;
      const candidate: Candidate = {
        content: page.content,
        settings: JSON.stringify(getPageHistorySettings(page)),
      };
      if (observed?.content === candidate.content && observed.settings === candidate.settings &&
        observedUpdatedAt === page.updatedAt) return;
      clearIdle();
      const silent = observedUpdatedAt === page.updatedAt && observed?.settings === candidate.settings;
      observed = candidate;
      observedUpdatedAt = page.updatedAt;
      // Keep a reference to the baseline. Its text and normalized fingerprint
      // are derived lazily, only when an authored edit actually needs them.
      if (!baseline || (silent && !pending && !recording)) {
        baseline = candidate;
        return;
      }
      if (!recording && baseline.content === candidate.content && baseline.settings === candidate.settings) {
        pending = null;
        return;
      }
      pending = candidate;
      // Preserve the existing immediate 200-word trigger. These counts share
      // the identity cache used by activity recording; normalization stays lazy.
      const baselineCount = wordCount(baseline);
      if (baselineCount > 0 && Math.abs(wordCount(candidate) - baselineCount) >= CHAR_THRESHOLD) {
        tryFire();
        return;
      }
      idleTimer = setTimeout(tryFire, IDLE_MS);
    },
    dispose(): void {
      disposed = true;
      clearIdle();
      clearInterval(heartbeat);
      baseline = pending = observed = null;
    },
  };
}
