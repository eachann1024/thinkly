import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS, FONT, LAYOUT } from "../theme";
import { progressAt, scrollLinear } from "../motion";
import { BodyText, CARD_BORDER, Chip, Window } from "../components/Kit";
import { PixelArt } from "../components/PixelArt";
import { Eyebrow, MonoLabel, StaggerText } from "../components/Text";

const VIEW_HEIGHT = LAYOUT.mock.height - 56 - 66;

export function S6Share() {
  const frame = useCurrentFrame();
  const y = scrollLinear(frame, 56, 18);

  return (
    <AbsoluteFill>
      <Eyebrow index="06" label="分享图" />

      <div style={{ position: "absolute", ...LAYOUT.text, top: 250 }}>
        <StaggerText
          parts={[{ text: "写完，\n" }, { text: "一张图带走", serif: true }]}
          fontSize={92}
          lineHeight={1.18}
        />
        <div style={{ marginTop: 44 }}>
          <MonoLabel>长图 · 自动排版</MonoLabel>
        </div>
      </div>

      <Window title="导出 · 分享图" style={{ position: "absolute", ...LAYOUT.mock }}>
        <div style={{ height: VIEW_HEIGHT, overflow: "hidden", background: "rgba(27,26,23,0.03)" }}>
          <div style={{ padding: "26px 0", display: "flex", justifyContent: "center" }}>
            <div
              style={{
                width: 760,
                background: COLORS.white,
                borderRadius: 16,
                border: CARD_BORDER,
                boxShadow: "0 10px 22px rgba(27,26,23,0.09)",
                padding: "40px 44px 46px",
                transform: `translateY(${-y}px)`,
                display: "flex",
                flexDirection: "column",
                gap: 26,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <PixelArt kind="goose" pitch={2.6} radius={1.2} />
                <MonoLabel color={COLORS.inkSoft} size={19}>
                  思绪 · Thinkly
                </MonoLabel>
              </div>

              <BodyText size={44} weight={700} color={COLORS.ink} style={{ letterSpacing: "-0.03em" }}>
                给注意力留一点空间
              </BodyText>

              <div
                style={{
                  borderLeft: `3px solid ${COLORS.accent}`,
                  paddingLeft: 18,
                  color: COLORS.inkSoft,
                  fontFamily: FONT.serif,
                  fontStyle: "italic",
                  fontSize: 26,
                  lineHeight: 1.6,
                }}
              >
                把相关材料放在眼前，思考就少一次中断。
              </div>

              {[
                { k: "01", t: "保留原文的上下文" },
                { k: "02", t: "用自己的话整理重点" },
                { k: "03", t: "给今天留一个具体行动" },
              ].map((row) => (
                <div key={row.k} style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
                  <MonoLabel size={17} color={COLORS.accent}>
                    {row.k}
                  </MonoLabel>
                  <BodyText size={24} color={COLORS.inkSoft}>
                    {row.t}
                  </BodyText>
                </div>
              ))}

              <div style={{ height: 1, background: "rgba(27,26,23,0.10)" }} />

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[100, 92, 64].map((w, i) => (
                  <div
                    key={i}
                    style={{ height: 11, width: `${w}%`, borderRadius: 6, background: "rgba(27,26,23,0.12)" }}
                  />
                ))}
              </div>

              <BodyText size={30} weight={700} color={COLORS.ink}>
                下一步
              </BodyText>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[100, 88, 96, 54].map((w, i) => (
                  <div
                    key={i}
                    style={{ height: 11, width: `${w}%`, borderRadius: 6, background: "rgba(27,26,23,0.12)" }}
                  />
                ))}
              </div>

              <div
                style={{
                  background: COLORS.accentSoft,
                  borderRadius: 14,
                  padding: "22px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <MonoLabel size={17} color={COLORS.accent}>
                  今天就能做
                </MonoLabel>
                <BodyText size={24} color={COLORS.ink}>
                  把收藏的段落读一遍，写下三句话。
                </BodyText>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[100, 74].map((w, i) => (
                  <div
                    key={i}
                    style={{ height: 11, width: `${w}%`, borderRadius: 6, background: "rgba(27,26,23,0.12)" }}
                  />
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <MonoLabel size={17}>note.cooool.top</MonoLabel>
                <MonoLabel size={17}>本地 Markdown</MonoLabel>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            height: 66,
            borderTop: CARD_BORDER,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 22px",
            background: COLORS.white,
          }}
        >
          {["PNG", "PDF", "MD", "DOCX"].map((fmt, i) => (
            <div key={fmt} style={{ opacity: progressAt(frame, 12 + i * 6, 16) }}>
              <Chip active={i === 0}>{fmt}</Chip>
            </div>
          ))}
        </div>
      </Window>
    </AbsoluteFill>
  );
}
