import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS, FONT, LAYOUT } from "../theme";
import { progressAt, stampDrop } from "../motion";
import { BodyText, CARD_BORDER, Window } from "../components/Kit";
import { Eyebrow, MonoLabel, StaggerText } from "../components/Text";

const ROW_H = 58;
const ROW_GAP = 10;

const VERSIONS = [
  { time: "14:02", tag: "自动保存" },
  { time: "13:41", tag: "自动保存" },
  { time: "12:30", tag: "里程碑" },
  { time: "11:08", tag: "自动保存" },
  { time: "10:15", tag: "自动保存" },
  { time: "09:26", tag: "自动保存" },
  { time: "08:50", tag: "自动保存" },
  { time: "08:12", tag: "自动保存" },
];

export function S7History() {
  const frame = useCurrentFrame();
  const flag = stampDrop(frame, 140, -160);
  const restore = progressAt(frame, 168, 18);

  return (
    <AbsoluteFill>
      <Eyebrow index="07" label="历史" />

      <div style={{ position: "absolute", left: LAYOUT.text.left, top: 250, width: LAYOUT.text.width }}>
        <StaggerText
          parts={[{ text: "改错了，\n" }, { text: "随时回去", serif: true }]}
          fontSize={92}
          lineHeight={1.18}
        />
        <div style={{ marginTop: 44 }}>
          <MonoLabel>停笔自动存 · 最多 50 个版本</MonoLabel>
        </div>
      </div>

      <Window title="秋季读书会方案 · 历史版本" style={{ position: "absolute", ...LAYOUT.mock }}>
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, padding: "20px 24px", display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 18px",
                borderRadius: 12,
                border: `1.5px solid ${COLORS.accent}`,
                background: COLORS.accentSoft,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                <BodyText size={23} weight={700} color={COLORS.ink}>
                  现在
                </BodyText>
                <MonoLabel size={17} color={COLORS.accent}>
                  当前内容
                </MonoLabel>
              </div>
              <div
                style={{
                  opacity: Math.min(1, flag.opacity),
                  transform: `translateY(${flag.translateY}px) rotate(${flag.rotate}deg)`,
                  display: "inline-flex",
                  alignItems: "center",
                  height: 30,
                  padding: "0 12px",
                  borderRadius: 8,
                  background: COLORS.accent,
                  color: COLORS.white,
                  fontFamily: FONT.sans,
                  fontSize: 17,
                  fontWeight: 600,
                }}
              >
                里程碑
              </div>
            </div>

            <div style={{ marginTop: ROW_GAP }}>
              {VERSIONS.map((v, i) => {
                const p = progressAt(frame, 40 + i * 8, 20);
                return (
                  <div
                    key={v.time}
                    style={{
                      height: ROW_H * (1 - p),
                      marginBottom: ROW_GAP * (1 - p),
                      opacity: 1 - p,
                      overflow: "hidden",
                      border: CARD_BORDER,
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.66)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0 16px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                      <MonoLabel size={19} color={COLORS.inkSoft}>
                        {v.time}
                      </MonoLabel>
                      <MonoLabel size={16} color={v.tag === "里程碑" ? COLORS.accent : COLORS.muted}>
                        {v.tag}
                      </MonoLabel>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[46, 66, 34].map((w, k) => (
                        <div
                          key={k}
                          style={{ width: w, height: 7, borderRadius: 4, background: "rgba(27,26,23,0.14)" }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                marginTop: 16,
                flex: 1,
                minHeight: 0,
                overflow: "hidden",
                opacity: progressAt(frame, 108, 22),
                border: CARD_BORDER,
                borderRadius: 12,
                background: "rgba(255,255,255,0.62)",
                padding: "18px 22px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <BodyText size={26} weight={700} color={COLORS.ink}>
                秋季读书会方案
              </BodyText>
              {[100, 94, 88, 96, 72, 100, 66].map((w, i) => (
                <div
                  key={i}
                  style={{ height: 10, width: `${w}%`, borderRadius: 5, background: "rgba(27,26,23,0.13)" }}
                />
              ))}
              <div
                style={{
                  marginTop: 4,
                  borderLeft: `3px solid ${COLORS.accent}`,
                  paddingLeft: 14,
                  color: COLORS.muted,
                  fontFamily: FONT.serif,
                  fontStyle: "italic",
                  fontSize: 21,
                }}
              >
                慢慢来，比较快。
              </div>
            </div>

            <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: 44,
                  padding: "0 20px",
                  borderRadius: 11,
                  background: COLORS.accent,
                  color: COLORS.white,
                  fontFamily: FONT.sans,
                  fontSize: 20,
                  fontWeight: 600,
                  opacity: restore,
                }}
              >
                还原到此版本
              </div>
              <div style={{ opacity: restore }}>
                <MonoLabel size={17}>还原前先存一版</MonoLabel>
              </div>
            </div>
          </div>

          <div
            style={{
              width: 268,
              borderLeft: CARD_BORDER,
              padding: "20px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              background: "rgba(255,255,255,0.5)",
            }}
          >
            <MonoLabel size={17}>版本</MonoLabel>
            {["14:02", "12:30", "11:08", "10:15"].map((time, i) => (
              <div
                key={time}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  padding: 12,
                  borderRadius: 10,
                  border: CARD_BORDER,
                  background: COLORS.white,
                  opacity: progressAt(frame, 18 + i * 7, 18),
                }}
              >
                <MonoLabel size={15}>{time}</MonoLabel>
                {[100, 72].map((w, k) => (
                  <div
                    key={k}
                    style={{ height: 8, width: `${w}%`, borderRadius: 4, background: "rgba(27,26,23,0.13)" }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </Window>
    </AbsoluteFill>
  );
}
