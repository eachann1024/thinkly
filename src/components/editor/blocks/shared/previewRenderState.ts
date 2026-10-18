export type PreviewRenderResult =
  | { phase: "success"; identity: string; html: string }
  | { phase: "empty" | "error"; identity: string };
export type PreviewRenderState =
  | { phase: "idle" }
  | { phase: "loading"; identity: string; previous?: PreviewRenderResult }
  | PreviewRenderResult;
export type PreviewRenderEvent =
  | { type: "render-requested"; identity: string }
  | { type: "rendered"; identity: string; html: string }
  | { type: "empty" | "failed"; identity: string }
  | { type: "release" };

export function previewRenderReducer(state: PreviewRenderState, event: PreviewRenderEvent): PreviewRenderState {
  if (event.type === "release") return { phase: "idle" };
  if (event.type === "render-requested") {
    return { phase: "loading", identity: event.identity,
      previous: state.phase === "loading" ? state.previous : state.phase === "idle" ? undefined : state };
  }
  if (state.phase !== "loading" || state.identity !== event.identity) return state;
  switch (event.type) {
    case "rendered": return { phase: "success", identity: event.identity, html: event.html };
    case "empty": return { phase: "empty", identity: event.identity };
    case "failed": return { phase: "error", identity: event.identity };
  }
}

export function previewRenderHTML(state: PreviewRenderState): string {
  const result = state.phase === "loading" ? state.previous : state;
  return result?.phase === "success" ? result.html : "";
}
