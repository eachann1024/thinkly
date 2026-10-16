import type { LocalFontOption } from "@/lib/localFontOptions";
export type LocalFontLoadState =
  | { status: "idle" }
  | { status: "loading"; fonts: LocalFontOption[] | null }
  | { status: "ready"; fonts: LocalFontOption[] }
  | { status: "error"; fonts: LocalFontOption[] | null };
type LoadEvent = { type: "load" | "failed" } | { type: "loaded"; fonts: LocalFontOption[] };
export function localFontLoadReducer(state: LocalFontLoadState, event: LoadEvent): LocalFontLoadState {
  if (event.type === "loaded") return { status: "ready", fonts: event.fonts };
  const fonts = state.status === "idle" ? null : state.fonts;
  return { status: event.type === "load" ? "loading" : "error", fonts };
}
export type FontProbeState = { status: "idle" } | { status: "probing"; family: string } | { status: "ready"; family: string; available: boolean };
type ProbeEvent = { type: "reset" } | { type: "probe"; family: string } | { type: "probed"; family: string; available: boolean };
export function fontProbeReducer(state: FontProbeState, event: ProbeEvent): FontProbeState {
  if (event.type === "reset") return { status: "idle" };
  if (event.type === "probe") return { status: "probing", family: event.family };
  return state.status === "probing" && state.family === event.family ? { status: "ready", family: event.family, available: event.available } : state;
}
