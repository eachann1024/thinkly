import { AbsoluteFill } from "remotion";
import { COLORS } from "../theme";
import { SourceCards } from "../components/SourceCards";
import { Eyebrow, StaggerText } from "../components/StaggerText";

export function S5Sources() {
  return (
    <AbsoluteFill style={{ background: COLORS.lilac }}>
      <Eyebrow right="05 / SOURCES" />

      <div style={{ position: "absolute", left: 96, top: 200, width: 888 }}>
        <StaggerText parts={[{ text: "每个结论，" }]} fontSize={88} delay={2} style={{ marginBottom: 8 }} />
        <StaggerText
          parts={[{ text: "都能回到" }, { text: "原文", serif: true }]}
          fontSize={88}
          delay={16}
        />
      </div>

      <SourceCards />
    </AbsoluteFill>
  );
}
