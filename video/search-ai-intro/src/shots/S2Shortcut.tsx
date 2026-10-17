import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, FONT, HEIGHT, SHEET } from "../theme";
import { EASE_CARD } from "../motion";
import { SearchSheetMock } from "../components/SearchSheetMock";
import { Eyebrow, StaggerText } from "../components/StaggerText";

export function S2Shortcut() {
  const frame = useCurrentFrame();
  const rise = interpolate(frame, [90, 108], [HEIGHT, SHEET.top], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_CARD,
  });

  return (
    <AbsoluteFill style={{ background: COLORS.sky }}>
      <Eyebrow right="02 / SHORTCUT" />

      <div style={{ position: "absolute", left: 96, top: 170, width: 888 }}>
        <StaggerText parts={[{ text: "一个入口，" }]} fontSize={88} delay={-8} style={{ marginBottom: 8 }} />
        <StaggerText
          parts={[{ text: "搜笔记，" }, { text: "也问 AI", serif: true }]}
          fontSize={88}
          delay={4}
        />
      </div>

      <div style={{ position: "absolute", left: 96, top: 446, display: "flex", alignItems: "center", gap: 40 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 300,
            height: 142,
            borderRadius: 20,
            border: `2px solid ${COLORS.ink}`,
            background: COLORS.white,
            boxShadow: `0 9px 0 ${COLORS.ink}`,
            fontFamily: FONT.mono,
            fontSize: 62,
            color: COLORS.ink,
            letterSpacing: "0.02em",
          }}
        >
          ⌘ K
        </div>
        <div style={{ fontFamily: FONT.sans, fontSize: 40, color: COLORS.inkSoft }}>随时唤起</div>
      </div>

      <SearchSheetMock
        resultCount={3}
        style={{ top: rise, transform: "none" }}
      />
    </AbsoluteFill>
  );
}
