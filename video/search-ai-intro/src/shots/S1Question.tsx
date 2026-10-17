import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS } from "../theme";
import { textSpring } from "../motion";
import { DotGrid, HalftoneText } from "../components/DotGrid";
import { PixelArt } from "../components/PixelArt";
import { Eyebrow, MonoLabel, StaggerText } from "../components/StaggerText";

export function S1Question() {
  const frame = useCurrentFrame();
  const p = textSpring(frame, 0);
  const rise = (1 - p) * 40;

  return (
    <AbsoluteFill style={{ background: COLORS.paper }}>
      <DotGrid pitch={8} radius={1.3} opacity={0.14} />
      <Eyebrow right="01 / QUESTION" />

      <div style={{ position: "absolute", left: 96, top: 196, width: 888 }}>
        <StaggerText
          parts={[{ text: "笔记越写越多" }]}
          fontSize={84}
          delay={4}
          style={{ marginBottom: 10 }}
        />
        <StaggerText
          parts={[{ text: "想找的，" }, { text: "还找得到吗？", serif: true }]}
          fontSize={84}
          delay={18}
        />
      </div>

      <div
        style={{
          position: "absolute",
          left: 540,
          top: 690,
          transform: `translateY(${rise}px)`,
        }}
      >
        <HalftoneText text="?" width={460} height={560} fontSize={620} pitch={8} radius={2} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 104,
          top: 1030,
          transform: `translateY(${rise}px)`,
        }}
      >
        <PixelArt kind="person" pose="ask" pitch={9} radius={2.2} />
      </div>

      <div style={{ position: "absolute", left: 96, bottom: 140 }}>
        <MonoLabel>POINT MATRIX / 1-BIT</MonoLabel>
      </div>
    </AbsoluteFill>
  );
}
