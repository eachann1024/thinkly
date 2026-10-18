import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS, FONT } from "../theme";
import { textSpring } from "../motion";
import { PixelArt } from "../components/PixelArt";

/** 品牌定格：最后 234 帧完全静止。 */
const FREEZE = 66;

export function S9Brand() {
  const frame = Math.min(useCurrentFrame(), FREEZE);
  const goose = textSpring(frame, 0);
  const name = textSpring(frame, 12);
  const meta = textSpring(frame, 26);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ opacity: goose, transform: `translateY(${(1 - goose) * 40}px)` }}>
          <PixelArt kind="goose" pitch={7} radius={2.8} />
        </div>

        <div
          style={{
            marginTop: 34,
            display: "flex",
            alignItems: "baseline",
            gap: 20,
            opacity: name,
            transform: `translateY(${(1 - name) * 40}px)`,
          }}
        >
          <span style={{ fontFamily: FONT.sans, fontWeight: 700, fontSize: 104, letterSpacing: "-0.03em", color: COLORS.ink }}>
            思绪
          </span>
          <span style={{ width: 2, height: 72, background: "rgba(27,26,23,0.16)", display: "block" }} />
          <span style={{ fontFamily: FONT.serif, fontStyle: "italic", fontSize: 104, color: COLORS.ink }}>
            Thinkly
          </span>
        </div>

        <div style={{ marginTop: 18, opacity: meta, transform: `translateY(${(1 - meta) * 20}px)` }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 24, letterSpacing: "0.08em", color: COLORS.muted }}>
            note.cooool.top
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
