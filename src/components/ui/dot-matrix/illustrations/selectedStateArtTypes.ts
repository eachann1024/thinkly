export type SelectedArtTone = "ink" | "accent" | "danger";
type Paint = { tone: SelectedArtTone; alpha: number };
export type SelectedArtPart = Paint & (
  | { d: string; width: number; gap: number }
  | { x: number; y: number; r: number }
);
export type SelectedArtGroup = {
  parts: SelectedArtPart[];
  motion: "breathe" | "ripple" | "sway" | null;
  phase: number;
  period: number;
  low: number;
  amplitude: number;
  origin: [number, number];
};
export type SelectedArt = {
  variant: "A" | "B";
  width: number;
  height: number;
  plane: [number, number];
  backdropPlane: [number, number];
  foreground: SelectedArtGroup[];
  background: SelectedArtGroup[];
};
