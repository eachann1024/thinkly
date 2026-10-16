import { useCallback, useLayoutEffect, useReducer, useRef } from "react";
import { toast } from "@/components/ui/sonner";
import { openPreviewInSystem, previewPointerHandlers, type PreviewContent } from "@/lib/preview/previewAction";
import type { ArtifactActionsProps } from "./artifactActionTypes";
import { artifactPreviewSnapshot, transitionArtifactPreview, type ArtifactPreviewEvent, type ArtifactPreviewState } from "./artifactPreviewState";

type Input = Pick<ArtifactActionsProps, "onPreview" | "onPreviewImage"> & { identity: string; previewFilename: string };
export function useArtifactPreview({ identity, onPreview, onPreviewImage, previewFilename }: Input) {
  const [preview, dispatch] = useReducer(transitionArtifactPreview, { phase: "idle" });
  const previewRef = useRef<ArtifactPreviewState>(preview);
  const sequence = useRef(0);
  const mounted = useRef(true);
  const source = useRef(identity);
  const send = useCallback((event: ArtifactPreviewEvent) => {
    previewRef.current = transitionArtifactPreview(previewRef.current, event);
    dispatch(event);
  }, []);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useLayoutEffect(() => {
    if (source.current === identity) return;
    source.current = identity;
    send({ type: "source-changed" });
  }, [identity, send]);
  const request = (target: "internal" | "system") => {
    if (previewRef.current.phase === "resolving") return;
    const id = ++sequence.current;
    const requestSource = identity;
    send({ type: "requested", id, target });
    const current = () => mounted.current && source.current === requestSource &&
      previewRef.current.phase === "resolving" && previewRef.current.id === id;
    void (async () => {
      try {
        let content: PreviewContent;
        if (onPreview) content = await onPreview();
        else if (onPreviewImage) content = { kind: "image", data: await onPreviewImage(), fileName: previewFilename };
        else throw new Error("预览不可用");
        if (!current()) return;
        if (target === "internal") send({ type: "internal-resolved", id, content });
        else {
          await openPreviewInSystem(content);
          if (current()) send({ type: "system-opened", id });
        }
      } catch (error) {
        if (!current()) return;
        const message = error instanceof Error ? error.message : "未知错误";
        send({ type: "failed", id, error: message });
        toast.error(`${target === "internal" ? "预览失败" : "系统预览失败"}：${message}`);
      }
    })();
  };
  const snapshot = artifactPreviewSnapshot(preview);
  return {
    previewing: preview.phase === "resolving",
    previewContent: snapshot.phase === "open" ? snapshot.content : null,
    closePreview: () => send({ type: "closed" }),
    previewHandlers: previewPointerHandlers({ disabled: preview.phase === "resolving",
      onInternal: () => request("internal"), onSystem: () => request("system") }),
  };
}
