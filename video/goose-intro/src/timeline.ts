export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const TOTAL_FRAMES = 1800;

export const CREAM = '#f6f1e4';
export const INK = '#3b3a36';

type Range = { from: number; to: number };
const range = (from: number, to: number): Range => ({ from, to });

/** 镜头帧范围（含首尾），与 STORYBOARD.md 镜头表一致。 */
export const S1 = range(0, 219);
export const S2 = range(200, 459);
export const S3 = range(440, 689);
export const S4 = range(670, 939);
export const S5 = range(910, 1179);
export const S6 = range(1160, 1429);
export const S7 = range(1405, 1799);

export const dur = (r: Range) => r.to - r.from + 1;

/** 转场帧。覆盖满画面的"切点"是被遮挡镜头隐藏／显现的帧。 */
export const CLOUD_WIPE = { ...range(190, 230), cut: 210 };
export const CREAM_DISSOLVE = { ...range(440, 459), cut: 450 };
export const LEAF_WIPE = range(670, 710);
export const WARM_DISSOLVE = range(910, 939);
export const LIGHT_DISSOLVE = { ...range(1160, 1179), cut: 1170 };
export const ROUND_WINDOW = range(1405, 1429);
export const END_FADE = range(1770, 1799);

/** 镜头内主运动区间。 */
export const S1_PAN = range(0, 200);
export const S2_PUSH = range(200, 459);
export const S4_PAN = range(670, 939);
export const S5_GATHER = range(940, 1100);
export const S6_PAN = range(1160, 1429);
export const S7_TILT = range(1405, 1600);
export const S7_LOGO_AT = 1560;

/** 字幕：进入 18 帧，停留至少 75 帧，退出 12 帧。 */
export const CAPTION_IN = 18;
export const CAPTION_OUT = 12;
export const CAP = {
  s1: { at: 40, outAt: 165 },
  s2: { at: 235, outAt: 420 },
  s3: { at: 470, outAt: 645 },
  s4: { at: 715, outAt: 895 },
  s5: { at: 950, outAt: 1120 },
  s6: { at: 1215, outAt: 1385 },
} as const;
