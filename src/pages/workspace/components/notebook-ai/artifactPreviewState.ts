export type ArtifactPreviewState =
  | { phase: "idle" }
  | { phase: "resolving"; id: number; target: "internal" | "system" }
  | { phase: "failed"; error: string };
export type ArtifactPreviewEvent =
  | { type: "requested"; id: number; target: "internal" | "system" }
  | { type: "opened"; id: number }
  | { type: "failed"; id: number; error: string }
  | { type: "source-changed" };
export function transitionArtifactPreview(state: ArtifactPreviewState, event: ArtifactPreviewEvent): ArtifactPreviewState {
  if (event.type === "source-changed") return { phase: "idle" };
  if (event.type === "requested") return state.phase === "resolving" ? state : {
    phase: "resolving", id: event.id, target: event.target,
  };
  if (state.phase !== "resolving" || state.id !== event.id) return state;
  if (event.type === "opened") return { phase: "idle" };
  return { phase: "failed", error: event.error };
}
