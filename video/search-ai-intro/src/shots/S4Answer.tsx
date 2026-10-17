import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS } from "../theme";
import { fadeColor } from "../motion";
import { SearchSheetMock } from "../components/SearchSheetMock";
import { Eyebrow, StaggerText } from "../components/StaggerText";

export function S4Answer() {
  const frame = useCurrentFrame();
  const fade = fadeColor(frame, 0, 12);

  return (
    <AbsoluteFill style={{ background: COLORS.mist }}>
      <AbsoluteFill style={{ background: COLORS.sand, opacity: fade }} />
      <Eyebrow right="04 / ANSWER" />

      <div style={{ position: "absolute", left: 96, top: 170, width: 888 }}>
        <StaggerText parts={[{ text: "AI 就地作答" }]} fontSize={88} delay={2} style={{ marginBottom: 8 }} />
        <StaggerText
          parts={[{ text: "引用你的" }, { text: "笔记", serif: true }]}
          fontSize={88}
          delay={16}
        />
      </div>

      <SearchSheetMock mode="answer" style={{ top: 640 }} />
    </AbsoluteFill>
  );
}
