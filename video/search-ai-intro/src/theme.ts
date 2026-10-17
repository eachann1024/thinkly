export const WIDTH = 1080;
export const HEIGHT = 1920;
export const FPS = 60;
export const DURATION = 2880;

/** 每个镜头 {start, end}，边界都落在 120 BPM 的拍点上（30 帧/拍）；每镜至少停留 5 秒。 */
export const SHOTS = {
  question: { start: 0, end: 330 },
  shortcut: { start: 330, end: 690 },
  search: { start: 690, end: 1050 },
  answer: { start: 1050, end: 1470 },
  sources: { start: 1470, end: 1830 },
  continue: { start: 1830, end: 2250 },
  promise: { start: 2250, end: 2550 },
  brand: { start: 2550, end: 2880 },
} as const;

/** 高明度低饱和场景色，只在转场或换镜时整屏切换。 */
export const COLORS = {
  ink: "#1b1a17",
  inkSoft: "#3c3830",
  muted: "#736f65",
  paper: "#f6f3ec",
  mist: "#edf2ee",
  sky: "#edf2f7",
  sand: "#f5efe5",
  lilac: "#f0eff5",
  rose: "#f6eeec",
  black: "#111110",
  white: "#ffffff",
  surface: "#fbf9f3",
  border: "rgba(27, 26, 23, 0.13)",
  borderSoft: "rgba(27, 26, 23, 0.07)",
  accent: "#547dd0",
  accentDeep: "#3e63b0",
  accentSoft: "#e5edfc",
  accentWash: "#dce8fa",
} as const;

export const FONT = {
  sans: '"Inter", "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", sans-serif',
  serif: '"Songti SC", "STSong", "Noto Serif SC", "Times New Roman", serif',
  mono: '"JetBrains Mono", "SF Mono", "Menlo", monospace',
} as const;

export const SAFE = 96;
export const SHEET = { left: 56, width: 968, top: 640, height: 1180, radius: 28 } as const;

export const SCENE_COLORS = [
  COLORS.paper,
  COLORS.sky,
  COLORS.mist,
  COLORS.sand,
  COLORS.lilac,
  COLORS.rose,
  COLORS.black,
] as const;
