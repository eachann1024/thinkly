import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS, FONT, LAYOUT } from "../theme";
import { progressAt } from "../motion";
import { BodyText, CARD_BORDER, Check, Window } from "../components/Kit";
import { Eyebrow, MonoLabel, StaggerText } from "../components/Text";

const LINES = [
  "这次读书会来的人比预期多，",
  "选书反馈也都挺积极。",
  "下次可以提前开放线上签到。",
];

export function S3Ai() {
  const frame = useCurrentFrame();
  const fill = progressAt(frame, 24, 96);
  const dim = progressAt(frame, 8, 18);

  return (
    <AbsoluteFill>
      <Eyebrow index="03" label="AI 对话" />

      <div style={{ position: "absolute", left: LAYOUT.text.left, top: 250, width: LAYOUT.text.width }}>
        <StaggerText
          parts={[{ text: "选中一段，\n" }, { text: "让 AI 接着写", serif: true }]}
          fontSize={92}
          lineHeight={1.18}
        />
        <div style={{ marginTop: 40, opacity: dim }}>
          <MonoLabel>空格 · ⌘J 唤起</MonoLabel>
        </div>
        <div style={{ marginTop: 14, opacity: progressAt(frame, 30, 20) }}>
          <MonoLabel>AI 默认关闭 · 你打开它才工作</MonoLabel>
        </div>
      </div>

      <Window title="读书会复盘.md" style={{ position: "absolute", ...LAYOUT.mock }}>
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          <div style={{ width: 396, padding: "28px 26px", borderRight: CARD_BORDER }}>
            <BodyText size={26} weight={700} color={COLORS.ink} style={{ marginBottom: 18 }}>
              读书会复盘
            </BodyText>
            <div
              style={{
                position: "relative",
                padding: "10px 12px",
                borderRadius: 8,
                background: COLORS.accentWash,
                opacity: dim,
              }}
            >
              <BodyText size={20} color={COLORS.inkSoft}>
                这次读书会来的人比预期多很多，大家对选书的反馈也都挺积极的，不过签到环节排队有点久，下次可以提前开放线上签到。
              </BodyText>
              <div
                style={{
                  position: "absolute",
                  left: -2,
                  top: 0,
                  bottom: 0,
                  width: 3,
                  borderRadius: 2,
                  background: COLORS.accent,
                }}
              />
            </div>
            <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 10 }}>
              {["", "", ""].map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 10,
                    borderRadius: 5,
                    width: i === 2 ? "62%" : "100%",
                    background: "rgba(27,26,23,0.11)",
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ flex: 1, padding: "22px 26px", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    border: `1.6px solid ${COLORS.accent}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: FONT.mono,
                    fontSize: 15,
                    color: COLORS.accent,
                  }}
                >
                  AI
                </div>
                <BodyText size={20} color={COLORS.ink} weight={600}>
                  行内 AI
                </BodyText>
              </div>
              <MonoLabel size={18}>READ ONLY</MonoLabel>
            </div>

            <div style={{ height: 3, borderRadius: 2, background: "rgba(27,26,23,0.10)" }}>
              <div
                style={{
                  height: 3,
                  borderRadius: 2,
                  width: `${fill * 100}%`,
                  background: COLORS.accent,
                }}
              />
            </div>

            <div style={{ alignSelf: "flex-end", maxWidth: 320, opacity: progressAt(frame, 30, 18) }}>
              <div
                style={{
                  background: "rgba(27,26,23,0.05)",
                  borderRadius: 12,
                  padding: "12px 16px",
                  transform: `scale(${0.96 + progressAt(frame, 30, 18) * 0.04})`,
                  transformOrigin: "100% 50%",
                }}
              >
                <BodyText size={20} color={COLORS.inkSoft}>
                  把这段改短一点
                </BodyText>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {LINES.map((line, i) => {
                const p = progressAt(frame, 54 + i * 14, 16);
                return (
                  <div key={line} style={{ opacity: p, transform: `translateY(${(1 - p) * 14}px)` }}>
                    <BodyText size={21} color={COLORS.ink}>
                      {line}
                    </BodyText>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                marginTop: 4,
                border: CARD_BORDER,
                borderRadius: 12,
                padding: "14px 16px",
                background: "rgba(255,255,255,0.7)",
                opacity: progressAt(frame, 104, 16),
                transform: `translateY(${(1 - progressAt(frame, 104, 16)) * 16}px)`,
              }}
            >
              {[
                { sign: "−", text: "大家对选书的反馈也都挺积极的", color: COLORS.muted },
                { sign: "＋", text: "选书反馈挺积极", color: COLORS.ink },
              ].map((row) => (
                <div key={row.sign} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                  <span style={{ fontFamily: FONT.mono, fontSize: 17, color: COLORS.accent }}>{row.sign}</span>
                  <BodyText size={19} color={row.color}>
                    {row.text}
                  </BodyText>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                opacity: progressAt(frame, 126, 16),
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  height: 46,
                  padding: "0 22px",
                  borderRadius: 12,
                  background: COLORS.accent,
                  color: COLORS.white,
                  fontFamily: FONT.sans,
                  fontSize: 21,
                  fontWeight: 600,
                }}
              >
                <Check size={18} color={COLORS.white} />
                同意
              </div>
              <MonoLabel size={18} color={COLORS.muted}>
                ⌘ ↵
              </MonoLabel>
            </div>
          </div>
        </div>
      </Window>

    </AbsoluteFill>
  );
}
