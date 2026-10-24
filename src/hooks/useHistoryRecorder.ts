import { useEffect, useRef } from "react";
import type { BlockNoteContent } from "@/components/editor/utils/blocknote-content";
import { getContentDerivations } from "@/components/editor/utils/content-derivations-cache";
import { getHistoryContentSignature } from "@/lib/history/contentSignature";
import { recordHistorySnapshotDetailed } from "@/lib/history/snapshot";
import { useAiStatus } from "@/stores/useAiStatus";
import { useHistoryView } from "@/stores/useHistoryView";

const IDLE_MS = 15_000;
const HEARTBEAT_MS = 30_000;
const CHAR_THRESHOLD = 200;

export function useHistoryRecorder(params: {
  pageId: string | null;
  workspaceId: string | null;
  content: BlockNoteContent | undefined;
  signature: string;
  updatedAt: number | undefined;
}) {
  const { pageId, workspaceId, content, signature, updatedAt } = params;

  const observedUpdatedAtRef = useRef<number | undefined>(undefined);
  const lastRecordedSigRef = useRef<string | null>(null);
  const lastRecordedFingerprintRef = useRef<string | null>(null);
  const lastRecordedCharRef = useRef<number>(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingRef = useRef(false);
  const pendingRef = useRef<{
    content: BlockNoteContent;
    charCount: number;
    signature: string;
    fingerprint: string;
  } | null>(null);

  useEffect(() => {
    lastRecordedSigRef.current = null;
    observedUpdatedAtRef.current = undefined;
    lastRecordedFingerprintRef.current = null;
    lastRecordedCharRef.current = 0;
    recordingRef.current = false;
    pendingRef.current = null;
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, [pageId]);

  useEffect(() => {
    if (!pageId || !workspaceId) return;
    let cancelled = false;

    const tryFire = () => {
      if (recordingRef.current) return;
      const p = pendingRef.current;
      if (!p) return;
      if (p.signature === lastRecordedSigRef.current) return;
      if (
        lastRecordedFingerprintRef.current !== null &&
        p.fingerprint === lastRecordedFingerprintRef.current
      ) {
        pendingRef.current = null;
        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current);
          idleTimerRef.current = null;
        }
        return;
      }
      if (useAiStatus.getState().phase === "streaming") return;

      const sig = p.signature;
      const fingerprint = p.fingerprint;
      const charCount = p.charCount;
      recordingRef.current = true;
      recordHistorySnapshotDetailed({
        pageId,
        workspaceId,
        content: p.content,
        trigger: "idle",
      })
        .then((result) => {
          if (cancelled) return;
          if (result.status === "rate-limited") {
            if (pendingRef.current) {
              if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
              idleTimerRef.current = setTimeout(
                tryFire,
                Math.max(0, result.retryAt - Date.now()),
              );
            }
            return;
          }

          if (pendingRef.current?.signature === sig) {
            pendingRef.current = null;
          }
          lastRecordedSigRef.current = sig;
          lastRecordedFingerprintRef.current = fingerprint;
          lastRecordedCharRef.current = charCount;

          if (result.status === "created" || result.status === "updated") {
            const view = useHistoryView.getState();
            if (view.active === pageId) {
              view.bumpRefresh();
            }
          }
        })
        .catch((err) =>
          console.error("[history] recordHistorySnapshot failed:", err),
        )
        .finally(() => {
          if (!cancelled) recordingRef.current = false;
        });
    };

    (heartbeatRef as any).fire = tryFire;

    heartbeatRef.current = setInterval(() => {
      tryFire();
    }, HEARTBEAT_MS);

    return () => {
      cancelled = true;
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [pageId, workspaceId]);

  useEffect(() => {
    if (!pageId || !workspaceId || !content) return;
    const { wordCount: charCount } = getContentDerivations(content, signature);
    const fingerprint = getHistoryContentSignature(content);

    // 首次读入和编辑器静默规范化只建立基线，不视为用户编辑。
    const silentUpdate = observedUpdatedAtRef.current === updatedAt;
    observedUpdatedAtRef.current = updatedAt;
    if (lastRecordedFingerprintRef.current === null ||
      (silentUpdate && !pendingRef.current && !recordingRef.current)) {
      lastRecordedSigRef.current = signature;
      lastRecordedFingerprintRef.current = fingerprint;
      lastRecordedCharRef.current = charCount;
      return;
    }

    if (
      !recordingRef.current &&
      lastRecordedFingerprintRef.current !== null &&
      fingerprint === lastRecordedFingerprintRef.current
    ) {
      pendingRef.current = null;
      return;
    }

    pendingRef.current = { content, charCount, signature, fingerprint };

    const fire = (heartbeatRef as any).fire as (() => void) | undefined;

    const charDelta = Math.abs(charCount - lastRecordedCharRef.current);
    if (charDelta >= CHAR_THRESHOLD && lastRecordedCharRef.current > 0) {
      fire?.();
      return;
    }

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      fire?.();
    }, IDLE_MS);

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [pageId, workspaceId, content, signature, updatedAt]);
}
