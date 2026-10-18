import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS, FONT, LAYOUT } from "../theme";
import { progressAt, stampDrop } from "../motion";
import { BodyText, CARD_BORDER, Keycap, Window } from "../components/Kit";
import { Eyebrow, MonoLabel, StaggerText } from "../components/Text";

const STICKY = { left: 1064, top: 556, width: 596, height: 264 };

export function S4QuickNote() {
  const frame = useCurrentFrame();
  const drop = stampDrop(frame, 30, -520);
  const pin = stampDrop(frame, 96, -220);
  const keys = progressAt(frame, 14, 18);

  return (
    <AbsoluteFill>
      <Eyebrow index="04" label="速记小窗" />

      <div style={{ position: "absolute", ...LAYOUT.text, top: 250 }}>
        <StaggerText
          parts={[{ text: "任何软件里，\n" }, { text: "按下就能记", serif: true }]}
          fontSize={92}
          lineHeight={1.18}
        />
        <div style={{ marginTop: 44, display: "flex", gap: 12, opacity: keys }}>
          <Keycap>Alt</Keycap>
          <Keycap>N</Keycap>
        </div>
        <div style={{ marginTop: 26, opacity: keys }}>
          <MonoLabel>Alt + 1–5 五张便签</MonoLabel>
        </div>
      </div>

      <div style={{ position: "absolute", ...LAYOUT.mock }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: LAYOUT.mock.radius,
            background: "rgba(255,255,255,0.42)",
            border: CARD_BORDER,
          }}
        />

        <Window
          title="收件箱 — 团队周会"
          style={{ position: "absolute", left: 40, top: 44, width: 620, height: 420, opacity: 0.92 }}
        >
          <div style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 14 }}>
            {[92, 100, 76, 100, 58].map((w, i) => (
              <div
                key={i}
                style={{
                  height: 12,
                  width: `${w}%`,
                  borderRadius: 6,
                  background: "rgba(27,26,23,0.12)",
                }}
              />
            ))}
            <div style={{ height: 68, borderRadius: 10, background: "rgba(27,26,23,0.06)" }} />
            {[100, 88].map((w, i) => (
              <div
                key={i}
                style={{ height: 12, width: `${w}%`, borderRadius: 6, background: "rgba(27,26,23,0.12)" }}
              />
            ))}
          </div>
        </Window>

        <div
          style={{
            position: "absolute",
            left: STICKY.left - LAYOUT.mock.left,
            top: STICKY.top - LAYOUT.mock.top,
            width: STICKY.width,
            height: STICKY.height,
            borderRadius: 16,
            background: COLORS.white,
            border: CARD_BORDER,
            boxShadow: "0 10px 24px rgba(27,26,23,0.16)",
            opacity: Math.min(1, drop.opacity),
            transform: `translateY(${drop.translateY}px) rotate(${drop.rotate}deg)`,
            padding: "18px 22px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 8 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    width: i === 0 ? 22 : 9,
                    height: 9,
                    borderRadius: 5,
                    background: i === 0 ? COLORS.ink : "rgba(27,26,23,0.18)",
                  }}
                />
              ))}
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                height: 30,
                padding: "0 12px",
                borderRadius: 9,
                background: COLORS.accentSoft,
                color: COLORS.accent,
                fontFamily: FONT.sans,
                fontSize: 17,
                fontWeight: 600,
                opacity: Math.min(1, pin.opacity),
                transform: `translateY(${pin.translateY}px) rotate(${pin.rotate}deg)`,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path
                  d="M7 1.4 12.2 6.6H9.2v5.6H4.8V6.6H1.8z"
                  fill="none"
                  stroke={COLORS.accent}
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
              置顶
            </div>
          </div>

          <BodyText size={23} color={COLORS.ink} style={{ lineHeight: 1.55 }}>
            会开到一半，先记一句：
            <br />
            周四之前把访谈结论发群里。
          </BodyText>

          <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <MonoLabel size={18}>草稿自动保存</MonoLabel>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 34,
                padding: "0 14px",
                borderRadius: 9,
                border: CARD_BORDER,
                fontFamily: FONT.sans,
                fontSize: 17,
                color: COLORS.inkSoft,
                background: "rgba(255,255,255,0.8)",
              }}
            >
              存入笔记
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
