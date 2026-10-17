import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "../theme";
import { EASE_CARD, fadeColor } from "../motion";
import { AiPanelMock } from "../components/AiPanelMock";
import { PixelArt } from "../components/PixelArt";
import { Eyebrow, StaggerText } from "../components/StaggerText";

export function S6Continue() {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [-8, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_CARD,
  });

  return (
    <AbsoluteFill style={{ background: COLORS.lilac }}>
      <AbsoluteFill style={{ background: COLORS.rose, opacity: fadeColor(frame, 0, 12) }} />
      <Eyebrow right="06 / CONTINUE" />

      <div style={{ position: "absolute", left: 96, top: 170, width: 700 }}>
        <StaggerText
          parts={[{ text: "问完，" }, { text: "接着聊", serif: true }]}
          fontSize={88}
          delay={2}
          style={{ marginBottom: 8 }}
        />
        <StaggerText parts={[{ text: "也接着写" }]} fontSize={88} delay={18} />
      </div>

      <div style={{ position: "absolute", left: 788, top: 300 }}>
        <PixelArt kind="person" pose="type" pitch={4.6} radius={1.7} opacity={0.9} />
      </div>

      <div
        style={{
          opacity: p,
          transform: `translateX(${(1 - p) * 120}px) scale(${0.92 + 0.08 * p})`,
        }}
      >
        <AiPanelMock />
      </div>
    </AbsoluteFill>
  );
}
