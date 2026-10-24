
export type DecorationTarget = "container" | "card";

export type BackgroundDecoration =
  | { kind: "grain"; target: DecorationTarget; tone: string; opacity: number; fibers?: boolean }
  | { kind: "dot-grid"; target: DecorationTarget; color: string; gap: number }
  | { kind: "line-grid"; target: DecorationTarget; color: string; gap: number }
  | { kind: "scanlines"; target: DecorationTarget; color: string }
  | { kind: "halftone-corner"; color: string; size: number }
  | { kind: "contribution-graph"; colors: [string, string, string, string, string] }
  | { kind: "palette-dots"; colors: string[] }
  | { kind: "starfield"; color: string }
  | { kind: "coffee-ring"; color: string }
  | { kind: "synth-horizon"; color: string }
  | { kind: "synth-sun"; color: string }
  | { kind: "trim-marks"; color: string; inset: number }
  | { kind: "hazard-hatch"; color: string };

export type PseudoDecoration =
  | { kind: "washi-tape"; color: string; angle: number }
  | { kind: "bookmark-ribbon"; color: string }
  | { kind: "edge-tab"; color: string; ink: string }
  | { kind: "offset-plate"; color: string; tint: string; offset: number }
  | { kind: "palette-strip"; colors: string[] }
  | { kind: "masthead-rule"; color: string }
  | { kind: "crosshair-corners"; color: string }
  | { kind: "stitched-border"; color: string }
  | { kind: "wax-seal"; color: string }
  | { kind: "stamp-seal"; color: string };

export type TypeDecoration =
  | { kind: "title-rule"; color: string; thickness: number; width?: number; gap: number }
  | { kind: "title-ornament"; color: string }
  | { kind: "pen-underline"; color: string }
  | { kind: "quote-mark"; color: string }
  | { kind: "quote-rule"; color: string; width: number }
  | { kind: "ink-bleed"; color: string }
  | { kind: "misregistration"; color: string }
  | { kind: "letterpress"; highlight: string }
  | { kind: "mono-footer"; color: string; dashed?: boolean };

export type CardDecoration = BackgroundDecoration | PseudoDecoration | TypeDecoration;
