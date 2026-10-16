export type ComposerSuggestionState =
  | { phase: "inactive" }
  | { phase: "active"; query: string; anchorRect: DOMRect; activeIndex: number };

export type ComposerSuggestionEvent =
  | { type: "detected"; query: string; anchorRect: DOMRect }
  | { type: "cleared" }
  | { type: "navigated"; delta: number; count: number };

export const inactiveSuggestion: ComposerSuggestionState = { phase: "inactive" };

export function composerSuggestionReducer(state: ComposerSuggestionState, event: ComposerSuggestionEvent): ComposerSuggestionState {
  switch (event.type) {
    case "cleared": return inactiveSuggestion;
    case "detected": return {
      phase: "active", query: event.query, anchorRect: event.anchorRect,
      activeIndex: state.phase === "active" && state.query === event.query ? state.activeIndex : 0,
    };
    case "navigated": {
      if (state.phase !== "active") return state;
      const count = Math.max(1, event.count);
      return { ...state, activeIndex: (state.activeIndex + event.delta + count) % count };
    }
  }
}
