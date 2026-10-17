import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS } from "../theme";
import { fadeColor } from "../motion";
import { SearchSheetMock } from "../components/SearchSheetMock";
import { Eyebrow, MonoLabel, StaggerText } from "../components/StaggerText";

export function S3Search() {
  const frame = useCurrentFrame();
  const fade = fadeColor(frame, 0, 12);

  return (
    <AbsoluteFill style={{ background: COLORS.sky }}>
      <AbsoluteFill style={{ background: COLORS.mist, opacity: fade }} />
      <Eyebrow right="03 / SEARCH" />

      <div style={{ position: "absolute", left: 96, top: 170, width: 888 }}>
        <StaggerText parts={[{ text: "一句话，" }]} fontSize={88} delay={2} style={{ marginBottom: 8 }} />
        <StaggerText
          parts={[{ text: "搜遍" }, { text: "所有笔记", serif: true }]}
          fontSize={88}
          delay={16}
        />
      </div>

      <div style={{ position: "absolute", left: 96, top: 586 }}>
        <MonoLabel>TITLE + BODY + PINYIN</MonoLabel>
      </div>

      <SearchSheetMock resultCount={4} style={{ top: 640 }} />
    </AbsoluteFill>
  );
}
