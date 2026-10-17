import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS } from "../theme";
import { textSpring } from "../motion";
import { PixelArt } from "../components/PixelArt";
import { MonoLabel, StaggerText } from "../components/StaggerText";

export function S8Brand() {
  const frame = useCurrentFrame();
  const mark = textSpring(frame, -14);
  const rule = textSpring(frame, 18);

  return (
    <AbsoluteFill style={{ background: COLORS.paper }}>
      <AbsoluteFill style={{ opacity: mark }}>
        <div
          style={{
            position: "absolute",
            left: 394,
            top: 540,
            transform: `translateY(${(1 - mark) * 40}px)`,
          }}
        >
          <PixelArt kind="goose" pitch={6.2} radius={2.2} />
        </div>

        <div style={{ position: "absolute", left: 96, right: 96, top: 902, textAlign: "center" }}>
          <StaggerText parts={[{ text: "思绪 · Thinkly" }]} fontSize={100} align="center" delay={-12} />
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 1048,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <MonoLabel size={28} color={COLORS.inkSoft} style={{ letterSpacing: "0.28em" }}>
            Thinkly
          </MonoLabel>
        </div>

        <div
          style={{
            position: "absolute",
            left: 492,
            top: 1120,
            width: 96,
            height: 4,
            borderRadius: 2,
            background: COLORS.accent,
            opacity: rule,
            transform: `scaleX(${rule})`,
            transformOrigin: "50% 50%",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 1172,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <MonoLabel size={24}>本地 MARKDOWN · 全局搜索 · AI 问答</MonoLabel>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
