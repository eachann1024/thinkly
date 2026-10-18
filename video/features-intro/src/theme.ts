export const WIDTH = 1920;
export const HEIGHT = 1080;
export const FPS = 60;
export const DURATION = 2880;

/** 镜头表：边界全部落在 120 BPM 的拍点上（30 帧/拍），每镜 240–360 帧。 */
export const SHOTS = {
  question: { start: 0, end: 270 },
  blocks: { start: 270, end: 630 },
  ai: { start: 630, end: 990 },
  quick: { start: 990, end: 1320 },
  split: { start: 1320, end: 1680 },
  share: { start: 1680, end: 2010 },
  history: { start: 2010, end: 2340 },
  promise: { start: 2340, end: 2580 },
  brand: { start: 2580, end: 2880 },
} as const;

export type ShotKey = keyof typeof SHOTS;

export const COLORS = {
  ink: "#1b1a17",
  inkSoft: "#3f3b33",
  muted: "#7b7568",
  paper: "#f6f3ec",
  sky: "#edf2f7",
  mist: "#edf2ee",
  sand: "#f5efe5",
  lilac: "#f0eff5",
  rose: "#f6eeec",
  jade: "#eff4f2",
  black: "#111110",
  white: "#ffffff",
  accent: "#547dd0",
  accentSoft: "#e3ebfa",
  accentWash: "#d8e4f9",
  line: "#d8d3c7",
  surface: "#fdfbf6",
} as const;

/** 场景色序列：高明度低饱和（L 92–97%），只在转场时整屏换色。 */
export const SCENE: Record<ShotKey, string> = {
  question: COLORS.paper,
  blocks: COLORS.sky,
  ai: COLORS.mist,
  quick: COLORS.sand,
  split: COLORS.lilac,
  share: COLORS.rose,
  history: COLORS.jade,
  promise: COLORS.black,
  brand: COLORS.paper,
};

export const FONT = {
  sans: '"Inter", "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", sans-serif',
  serif: '"Songti SC", "STSong", "Noto Serif SC", "Times New Roman", serif',
  mono: '"JetBrains Mono", "SF Mono", "Menlo", monospace',
} as const;

/** 16:9 版式：左栏文案，右栏演示，点阵小人固定左下。 */
export const LAYOUT = {
  safe: 120,
  text: { left: 120, top: 236, width: 620 },
  mock: { left: 820, top: 148, width: 980, height: 764, radius: 22 },
  figure: { left: 128, top: 596 },
  eyebrow: { top: 72, left: 120, right: 120 },
} as const;
