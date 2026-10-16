import type { PreviewContent } from "@/lib/preview/previewAction";
type Snapshot = { phase: "closed" } | { phase: "open"; content: PreviewContent };
export type ArtifactPreviewState =
  | { phase: "idle" }
  | { phase: "open"; content: PreviewContent }
  | { phase: "resolving"; id: number; target: "internal" | "system"; previous: Snapshot }
  | { phase: "failed"; error: string; previous: Snapshot };
export type ArtifactPreviewEvent =
  | { type: "requested"; id: number; target: "internal" | "system" }
  | { type: "internal-resolved"; id: number; content: PreviewContent }
  | { type: "system-opened"; id: number }
  | { type: "failed"; id: number; error: string }
  | { type: "closed" }
  | { type: "source-changed" };
export function artifactPreviewSnapshot(state: ArtifactPreviewState): Snapshot {
  if (state.phase === "open") return { phase: "open", content: state.content };
  return state.phase === "resolving" || state.phase === "failed" ? state.previous : { phase: "closed" };
}
export function transitionArtifactPreview(state: ArtifactPreviewState, event: ArtifactPreviewEvent): ArtifactPreviewState {
  if (event.type === "closed" || event.type === "source-changed") return { phase: "idle" };
  if (event.type === "requested") return state.phase === "resolving" ? state : {
    phase: "resolving", id: event.id, target: event.target, previous: artifactPreviewSnapshot(state),
  };
  if (state.phase !== "resolving" || state.id !== event.id) return state;
  switch (event.type) {
    case "internal-resolved": return state.target === "internal" ? { phase: "open", content: event.content } : state;
    case "system-opened": return state.target === "system"
      ? state.previous.phase === "open" ? state.previous : { phase: "idle" } : state;
    case "failed": return { phase: "failed", error: event.error, previous: state.previous };
  }
}
