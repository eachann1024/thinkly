export type VideoPlaybackState =
  | { phase: "loading" | "error"; source: string }
  | { phase: "ready"; source: string; playback: "playing" | "paused"; current: number; duration: number };

export type VideoPlaybackEvent =
  | { type: "source-changed"; source: string }
  | { type: "metadata-loaded"; source: string; duration: number; current: number; playing: boolean }
  | { type: "played" | "paused" | "ended" | "failed"; source: string }
  | { type: "time-updated"; source: string; current: number };

export function videoPlaybackReducer(state: VideoPlaybackState, event: VideoPlaybackEvent): VideoPlaybackState {
  if (event.type === "source-changed") return { phase: "loading", source: event.source };
  if (event.source !== state.source || state.phase === "error") return state;
  if (event.type === "failed") return { phase: "error", source: state.source };
  if (event.type === "metadata-loaded") {
    return {
      phase: "ready", source: state.source,
      playback: event.playing ? "playing" : "paused",
      duration: event.duration, current: event.current,
    };
  }
  if (state.phase !== "ready") return state;
  switch (event.type) {
    case "played": return { ...state, playback: "playing" };
    case "paused":
    case "ended": return { ...state, playback: "paused" };
    case "time-updated": return { ...state, current: event.current };
  }
}
