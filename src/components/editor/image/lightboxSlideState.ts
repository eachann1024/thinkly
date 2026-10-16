import type { SlideInfo } from "./lightboxTypes";

type SlideSnapshot = { slides: SlideInfo[]; index: number };
export type LightboxSlideState =
  | { phase: "closed"; snapshot?: SlideSnapshot }
  | { phase: "preparing"; request: number }
  | { phase: "open"; snapshot: SlideSnapshot }
  | { phase: "refreshing"; request: number; snapshot: SlideSnapshot }
  | { phase: "failed" };
export type LightboxSlideEvent =
  | { type: "open-requested"; request: number }
  | { type: "prepared"; request: number; slides: SlideInfo[]; index: number }
  | { type: "failed"; request: number }
  | { type: "closed" }
  | { type: "slide-viewed"; index: number };

export function lightboxSlideReducer(state: LightboxSlideState, event: LightboxSlideEvent): LightboxSlideState {
  if (event.type === "open-requested") {
    return state.phase === "open" || state.phase === "refreshing"
      ? { phase: "refreshing", request: event.request, snapshot: state.snapshot }
      : { phase: "preparing", request: event.request };
  }
  if (event.type === "closed") {
    return { phase: "closed", snapshot: "snapshot" in state ? state.snapshot : undefined };
  }
  if (event.type === "slide-viewed") {
    if (state.phase !== "open" && state.phase !== "refreshing") return state;
    const index = Math.max(0, Math.min(event.index, state.snapshot.slides.length - 1));
    return { ...state, snapshot: { ...state.snapshot, index } };
  }
  if ((state.phase !== "preparing" && state.phase !== "refreshing") || state.request !== event.request) return state;
  if (event.type === "failed" || event.slides.length === 0) {
    return state.phase === "refreshing" ? { phase: "open", snapshot: state.snapshot } : { phase: "failed" };
  }
  return { phase: "open", snapshot: { slides: event.slides,
    index: Math.max(0, Math.min(event.index, event.slides.length - 1)) } };
}
