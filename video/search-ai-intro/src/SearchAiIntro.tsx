import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { COLORS, DURATION, SHOTS, SHEET } from "./theme";
import { EASE_BG, EASE_CARD } from "./motion";
import { S1Question } from "./shots/S1Question";
import { S2Shortcut } from "./shots/S2Shortcut";
import { S3Search } from "./shots/S3Search";
import { S4Answer } from "./shots/S4Answer";
import { S5Sources } from "./shots/S5Sources";
import { S6Continue } from "./shots/S6Continue";
import { S7Promise } from "./shots/S7Promise";
import { S8Brand } from "./shots/S8Brand";

function ColorBlockPush({ color }: { color: string }) {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, 10], [1080, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_BG,
  });
  return (
    <AbsoluteFill style={{ transform: `translateX(${x}px)`, background: color }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 12, background: COLORS.accent }} />
    </AbsoluteFill>
  );
}

function SheetCollapse() {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_CARD,
  });
  return (
    <div
      style={{
        position: "absolute",
        left: SHEET.left,
        top: SHEET.top,
        width: SHEET.width,
        height: SHEET.height,
        borderRadius: `${SHEET.radius}px ${SHEET.radius}px 0 0`,
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        opacity: 1 - p,
        transform: `scale(${1 - 0.12 * p})`,
        transformOrigin: "50% 12%",
      }}
    />
  );
}

function ChipCollapse() {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_CARD,
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 96,
        top: 840,
        width: 888,
        height: 260,
        borderRadius: 18,
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        opacity: 1 - p,
        transform: `scale(${1 - 0.9 * p})`,
        transformOrigin: "50% 50%",
      }}
    />
  );
}

export function SearchAiIntro() {
  return (
    <AbsoluteFill style={{ background: COLORS.paper }}>
      <Sequence from={SHOTS.question.start} durationInFrames={SHOTS.question.end - SHOTS.question.start} name="01 提问">
        <S1Question />
      </Sequence>
      <Sequence from={SHOTS.shortcut.start} durationInFrames={SHOTS.shortcut.end - SHOTS.shortcut.start} name="02 唤起">
        <S2Shortcut />
      </Sequence>
      <Sequence from={SHOTS.search.start} durationInFrames={SHOTS.search.end - SHOTS.search.start} name="03 搜索">
        <S3Search />
      </Sequence>
      <Sequence from={SHOTS.answer.start} durationInFrames={SHOTS.answer.end - SHOTS.answer.start} name="04 作答">
        <S4Answer />
      </Sequence>
      <Sequence from={SHOTS.sources.start} durationInFrames={SHOTS.sources.end - SHOTS.sources.start} name="05 来源">
        <S5Sources />
      </Sequence>
      <Sequence from={SHOTS.continue.start} durationInFrames={SHOTS.continue.end - SHOTS.continue.start} name="06 继续">
        <S6Continue />
      </Sequence>
      <Sequence from={SHOTS.promise.start} durationInFrames={SHOTS.promise.end - SHOTS.promise.start} name="07 承诺">
        <S7Promise />
      </Sequence>
      <Sequence from={SHOTS.brand.start} durationInFrames={SHOTS.brand.end - SHOTS.brand.start} name="08 品牌">
        <S8Brand />
      </Sequence>

      <Sequence from={SHOTS.shortcut.start - 10} durationInFrames={12} name="转场 色块">
        <ColorBlockPush color={COLORS.sky} />
      </Sequence>
      <Sequence from={SHOTS.answer.start - 8} durationInFrames={18} name="转场 收拢">
        <SheetCollapse />
      </Sequence>
      <Sequence from={SHOTS.sources.start - 8} durationInFrames={12} name="转场 色块">
        <ColorBlockPush color={COLORS.lilac} />
      </Sequence>
      <Sequence from={SHOTS.continue.start - 8} durationInFrames={18} name="转场 收拢">
        <ChipCollapse />
      </Sequence>

      <Audio src={staticFile("audio/bed.wav")} volume={0.85} />
      <Sequence from={DURATION - 1} durationInFrames={1} name="末帧" />
    </AbsoluteFill>
  );
}
