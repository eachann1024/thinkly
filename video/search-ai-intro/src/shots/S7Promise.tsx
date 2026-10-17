import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS, FONT } from "../theme";
import { stampDrop } from "../motion";
import { Eyebrow, StaggerText } from "../components/StaggerText";

export function S7Promise() {
  const frame = useCurrentFrame();
  const stamp = stampDrop(frame, 100);

  return (
    <AbsoluteFill style={{ background: COLORS.black }}>
      <Eyebrow right="07 / PROMISE" />

      <div
        style={{
          position: "absolute",
          left: 96,
          right: 96,
          top: 560,
          textAlign: "center",
        }}
      >
        <StaggerText parts={[{ text: "写下的，" }]} fontSize={100} color={COLORS.white} align="center" delay={-8} />
        <StaggerText
          parts={[{ text: "都找得回来。", serif: true, color: COLORS.white }]}
          fontSize={100}
          align="center"
          delay={2}
        />
      </div>

      <div
        style={{
          position: "absolute",
          left: 330,
          top: 1216,
          width: 420,
          height: 148,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          borderRadius: 14,
          background: COLORS.accent,
          color: COLORS.white,
          opacity: stamp.opacity,
          transform: `translateY(${stamp.translateY}px) rotate(${stamp.rotate}deg) scale(${stamp.scale})`,
          transformOrigin: "50% 50%",
        }}
      >
        <div style={{ fontFamily: FONT.sans, fontSize: 48, fontWeight: 700, letterSpacing: "0.08em" }}>
          本地优先
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 20, letterSpacing: "0.2em", opacity: 0.86 }}>
          LOCAL FIRST
        </div>
      </div>
    </AbsoluteFill>
  );
}
