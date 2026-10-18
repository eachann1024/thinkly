import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS, FONT } from "../theme";
import { textSpring } from "../motion";
import { Sprite } from "../components/PixelArt";
import type { SpriteKey } from "../sprites";

/** 品牌定格：三个形象从画框底边升起，切帧挥手，最后 234 帧完全静止。 */
const FREEZE = 66;
const WAVE_AT = 36;
const CAST: Array<{ id: "a" | "b" | "g"; left: number; delay: number }> = [
  { id: "b", left: 328, delay: 6 },
  { id: "a", left: 768, delay: 0 },
  { id: "g", left: 1208, delay: 10 },
];

export function S9Brand() {
  const frame = Math.min(useCurrentFrame(), FREEZE);
  const name = textSpring(frame, 12);
  const meta = textSpring(frame, 26);

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 300,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
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
          <span style={{ fontFamily: FONT.serif, fontStyle: "italic", fontSize: 104, color: COLORS.ink, paddingRight: 12 }}>
            Thinkly
          </span>
        </div>

        <div style={{ marginTop: 18, opacity: meta, transform: `translateY(${(1 - meta) * 20}px)` }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 24, letterSpacing: "0.08em", color: COLORS.muted }}>
            note.cooool.top
          </div>
        </div>
      </div>

      {CAST.map(({ id, left, delay }) => {
        const p = textSpring(frame, delay);
        const pose = frame >= WAVE_AT + delay / 2 ? "wave" : "main";
        return (
          <div
            key={id}
            style={{ position: "absolute", left, top: 696, transform: `translateY(${Math.round((1 - p) * 400)}px)` }}
          >
            <Sprite name={`${id}-${pose}` as SpriteKey} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
