import { AbsoluteFill, Audio, Sequence, interpolateColors, staticFile, useCurrentFrame } from "remotion";
import { COLORS, DURATION, LAYOUT, SCENE, SHOTS, type ShotKey } from "./theme";
import { EASE_BG, progressAt } from "./motion";
import { PixelArt, type Pose } from "./components/PixelArt";
import { S1Question } from "./shots/S1Question";
import { S2Blocks } from "./shots/S2Blocks";
import { S3Ai } from "./shots/S3Ai";
import { S4QuickNote } from "./shots/S4QuickNote";
import { S5Split } from "./shots/S5Split";
import { S6Share } from "./shots/S6Share";
import { S7History } from "./shots/S7History";
import { S8Promise } from "./shots/S8Promise";
import { S9Brand } from "./shots/S9Brand";

const ORDER: ShotKey[] = [
  "question",
  "blocks",
  "ai",
  "quick",
  "split",
  "share",
  "history",
  "promise",
  "brand",
];

/** 底色只在转场时整屏交叉淡化；黑场与品牌卡是硬切。 */
const SOFT_BOUNDS = [270, 630, 990, 1320, 1680, 2010];
const HALF = 6;

const POSES: Record<ShotKey, Pose> = {
  question: "ask",
  blocks: "type",
  ai: "point",
  quick: "ask",
  split: "type",
  share: "point",
  history: "ask",
  promise: "raise",
  brand: "ask",
};

function shotIndexAt(frame: number) {
  let index = 0;
  ORDER.forEach((key, i) => {
    if (frame >= SHOTS[key].start) index = i;
  });
  return index;
}

function bgAt(frame: number) {
  const index = shotIndexAt(frame);
  const current = SCENE[ORDER[index]];
  for (const bound of SOFT_BOUNDS) {
    if (frame >= bound - HALF && frame <= bound + HALF) {
      const prevIndex = ORDER.findIndex((key) => SHOTS[key].start === bound) - 1;
      const nextIndex = prevIndex + 1;
      const p = progressAt(frame, bound - HALF, HALF * 2);
      return interpolateColors(p, [0, 1], [SCENE[ORDER[prevIndex]], SCENE[ORDER[nextIndex]]]);
    }
  }
  return current;
}

/** 色块推入。 */
function ColorBlockPush({ color }: { color: string }) {
  const frame = useCurrentFrame();
  const p = progressAt(frame, 0, 10);
  return (
    <AbsoluteFill style={{ transform: `translateX(${(1 - p) * 1920}px)` }}>
      <AbsoluteFill style={{ background: color }} />
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 14, background: COLORS.accent }} />
    </AbsoluteFill>
  );
}

/** 元素塌缩成下一主体。 */
function ElementCollapse({ from, to }: { from: { left: number; top: number; width: number; height: number }; to: { left: number; top: number; width: number; height: number } }) {
  const frame = useCurrentFrame();
  const p = progressAt(frame, 0, 14);
  const lerp = (a: number, b: number) => a + (b - a) * p;
  return (
    <div
      style={{
        position: "absolute",
        left: lerp(from.left, to.left),
        top: lerp(from.top, to.top),
        width: lerp(from.width, to.width),
        height: lerp(from.height, to.height),
        borderRadius: lerp(20, 14),
        background: COLORS.surface,
        border: `1px solid rgba(27,26,23,0.12)`,
        boxShadow: "0 10px 22px rgba(27,26,23,0.10)",
        opacity: 1 - progressAt(frame, 2, 9),
      }}
    />
  );
}

export function FeaturesIntro() {
  const frame = useCurrentFrame();
  const index = shotIndexAt(frame);
  const shotKey = ORDER[index];
  const dark = shotKey === "promise";

  return (
    <AbsoluteFill style={{ background: bgAt(frame), overflow: "hidden" }}>
      {frame < SHOTS.brand.start ? (
        <div style={{ position: "absolute", ...LAYOUT.figure }}>
          <PixelArt kind="person" pose={POSES[shotKey]} pitch={6} radius={2.4} color={dark ? COLORS.white : COLORS.ink} />
        </div>
      ) : null}

      <Sequence from={SHOTS.question.start} durationInFrames={SHOTS.question.end - SHOTS.question.start} name="01 提问">
        <S1Question />
      </Sequence>
      <Sequence from={SHOTS.blocks.start} durationInFrames={SHOTS.blocks.end - SHOTS.blocks.start} name="02 块编辑">
        <S2Blocks />
      </Sequence>
      <Sequence from={SHOTS.ai.start} durationInFrames={SHOTS.ai.end - SHOTS.ai.start} name="03 AI 对话">
        <S3Ai />
      </Sequence>
      <Sequence from={SHOTS.quick.start} durationInFrames={SHOTS.quick.end - SHOTS.quick.start} name="04 速记小窗">
        <S4QuickNote />
      </Sequence>
      <Sequence from={SHOTS.split.start} durationInFrames={SHOTS.split.end - SHOTS.split.start} name="05 分屏">
        <S5Split />
      </Sequence>
      <Sequence from={SHOTS.share.start} durationInFrames={SHOTS.share.end - SHOTS.share.start} name="06 分享图">
        <S6Share />
      </Sequence>
      <Sequence from={SHOTS.history.start} durationInFrames={SHOTS.history.end - SHOTS.history.start} name="07 历史">
        <S7History />
      </Sequence>
      <Sequence from={SHOTS.promise.start} durationInFrames={SHOTS.promise.end - SHOTS.promise.start} name="08 承诺">
        <S8Promise />
      </Sequence>
      <Sequence from={SHOTS.brand.start} durationInFrames={SHOTS.brand.end - SHOTS.brand.start} name="09 品牌">
        <S9Brand />
      </Sequence>

      <Sequence from={SHOTS.blocks.end} durationInFrames={14} name="转场 块塌缩">
        <ElementCollapse
          from={LAYOUT.mock}
          to={{ left: LAYOUT.mock.left + 260, top: LAYOUT.mock.top + 120, width: 460, height: 460 }}
        />
      </Sequence>
      <Sequence from={SHOTS.ai.end - 12} durationInFrames={12} name="转场 色块推入">
        <ColorBlockPush color={SCENE.quick} />
      </Sequence>
      <Sequence from={SHOTS.share.start} durationInFrames={14} name="转场 分屏塌缩">
        <ElementCollapse
          from={LAYOUT.mock}
          to={{ left: LAYOUT.mock.left + 90, top: LAYOUT.mock.top + 12, width: 800, height: 740 }}
        />
      </Sequence>

      <Audio src={staticFile("audio/bed.wav")} volume={0.85} />
      <Sequence from={DURATION - 1} durationInFrames={1} name="末帧" />
    </AbsoluteFill>
  );
}
