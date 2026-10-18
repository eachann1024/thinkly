import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS, LAYOUT } from "../theme";
import { progressAt } from "../motion";
import { BodyText, CARD_BORDER, Window } from "../components/Kit";
import { Eyebrow, MonoLabel, StaggerText } from "../components/Text";

const PANES = [
  { label: "阅读摘录 1", title: "给注意力留一点空间", body: "读到有启发的段落，先记下原文，再写自己的理解。" },
  { label: "读书笔记 2", title: "从摘录，到想法", body: "对照左边的材料，把有用的内容变成下一步行动。" },
  { label: "读书笔记 3", title: "留一个行动", body: "材料放在眼前，思考就少一次中断。" },
  { label: "资料 4", title: "上下文留在眼前", body: "一边翻资料，一边写，思路不用来回切。" },
];

const ROW_B = 330;

function Pane({ pane, frame, delay }: { pane: (typeof PANES)[number]; frame: number; delay: number }) {
  const p = progressAt(frame, delay, 18);
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        height: "100%",
        background: COLORS.white,
        border: CARD_BORDER,
        borderRadius: 12,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        overflow: "hidden",
        opacity: p,
      }}
    >
      <MonoLabel size={17}>{pane.label}</MonoLabel>
      <BodyText size={23} weight={700} color={COLORS.ink}>
        {pane.title}
      </BodyText>
      <BodyText size={18} color={COLORS.muted}>
        {pane.body}
      </BodyText>
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 9 }}>
        {[100, 92, 64].map((w, i) => (
          <div key={i} style={{ height: 8, width: `${w}%`, borderRadius: 4, background: "rgba(27,26,23,0.10)" }} />
        ))}
      </div>
    </div>
  );
}

export function S5Split() {
  const frame = useCurrentFrame();
  const split = progressAt(frame, 96, 22);

  return (
    <AbsoluteFill>
      <Eyebrow index="05" label="分屏" />

      <div style={{ position: "absolute", left: LAYOUT.text.left, top: 250, width: LAYOUT.text.width }}>
        <StaggerText
          parts={[{ text: "一边翻资料，\n" }, { text: "一边写", serif: true }]}
          fontSize={92}
          lineHeight={1.18}
        />
        <div style={{ marginTop: 44 }}>
          <MonoLabel>左右 / 上下 · 最多四格</MonoLabel>
        </div>
      </div>

      <Window title="分屏 · 4 格" style={{ position: "absolute", ...LAYOUT.mock }}>
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", gap: 12, padding: 22, paddingBottom: 6, flex: 1, minHeight: 0 }}>
            <Pane pane={PANES[0]} frame={frame} delay={8} />
            <Pane pane={PANES[1]} frame={frame} delay={16} />
          </div>

          <div
            style={{
              height: split * ROW_B,
              overflow: "hidden",
              display: "flex",
              gap: 12,
              padding: "0 22px",
            }}
          >
            <div
              style={{
                flex: 1,
                height: ROW_B - 24,
                transform: `translateY(${(1 - split) * 80}px)`,
              }}
            >
              <Pane pane={PANES[2]} frame={frame} delay={92} />
            </div>
            <div
              style={{
                flex: 1,
                height: ROW_B - 24,
                transform: `translateY(${(1 - split) * 80}px)`,
              }}
            >
              <Pane pane={PANES[3]} frame={frame} delay={100} />
            </div>
          </div>

          <div style={{ height: 22 + 22 * split }} />
        </div>

      </Window>
    </AbsoluteFill>
  );
}
