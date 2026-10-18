import { AbsoluteFill, useCurrentFrame } from "remotion";
import { LAYOUT } from "../theme";
import { textSpring } from "../motion";
import { QuestionMark } from "../components/PixelArt";
import { Eyebrow, MonoLabel, StaggerText } from "../components/Text";

/** 提问：点阵问号与文案一起升起，主运动=升起。 */
export function S1Question() {
  const frame = useCurrentFrame();
  const p = textSpring(frame, 10);
  const q = textSpring(frame, 18);

  return (
    <AbsoluteFill>
      <Eyebrow index="01" label="提问" />

      <div style={{ position: "absolute", left: LAYOUT.text.left, top: 268, width: LAYOUT.text.width }}>
        <StaggerText
          parts={[{ text: "记了很多，\n" }, { text: "找不到" }, { text: "那一页", serif: true }]}
          fontSize={92}
          lineHeight={1.18}
        />
        <div style={{ marginTop: 42, opacity: p }}>
          <MonoLabel>本地文件夹 · 每篇一个 .md</MonoLabel>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 1120,
          top: 236,
          opacity: Math.min(1, q * 1.6),
          transform: `translateY(${Math.round((1 - q) * 120)}px)`,
        }}
      >
        <QuestionMark />
      </div>
    </AbsoluteFill>
  );
}
