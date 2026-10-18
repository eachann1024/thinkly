import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS, FONT } from "../theme";
import { stampDrop, textSpring } from "../motion";
import { Eyebrow, MonoLabel, StaggerText } from "../components/Text";

/** 高潮承诺：黑场，强调色印章砸落。 */
export function S8Promise() {
  const frame = useCurrentFrame();
  const stamp = stampDrop(frame, 66, -320);
  const note = textSpring(frame, 54);

  return (
    <AbsoluteFill>
      <Eyebrow index="08" label="承诺" dark />

      <div style={{ position: "absolute", left: 120, top: 250, width: 640 }}>
        <StaggerText
          parts={[{ text: "笔记和 AI，\n" }, { text: "都不收钱", serif: true }]}
          fontSize={94}
          lineHeight={1.2}
          color={COLORS.white}
        />
        <div style={{ marginTop: 44, opacity: note }}>
          <MonoLabel color="rgba(255,255,255,0.56)">本地 Markdown · 零采集 · 无账号</MonoLabel>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 1290,
          top: 322,
          width: 320,
          height: 320,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          border: `6px solid ${COLORS.accent}`,
          borderRadius: 26,
          color: COLORS.accent,
          opacity: Math.min(1, stamp.opacity),
          transform: `translateY(${stamp.translateY}px) rotate(${-6 + stamp.rotate}deg) scale(${stamp.scale})`,
        }}
      >
        <div
          style={{
            fontFamily: FONT.sans,
            fontWeight: 700,
            fontSize: 64,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
          }}
        >
          永久
        </div>
        <div
          style={{
            fontFamily: FONT.sans,
            fontWeight: 700,
            fontSize: 64,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
          }}
        >
          免费
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 17, letterSpacing: "0.16em", opacity: 0.8 }}>
          FREE FOREVER
        </div>
      </div>
    </AbsoluteFill>
  );
}
