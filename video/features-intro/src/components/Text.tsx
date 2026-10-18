import type { CSSProperties, ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { COLORS, FONT, LAYOUT } from "../theme";
import { textSpring } from "../motion";

export type TextPart = { text: string; serif?: boolean; color?: string };

const TOKEN = /[A-Za-z0-9@#%&+_.:'’\-]+|[一-鿿]{1,2}|[^\s]/g;

function tokenize(text: string): string[] {
  return text.match(TOKEN) ?? [];
}

/** 陈述词无衬线 700，强调词衬线斜体 400，同字号同行混排；逐词上浮 3 帧一词。 */
export function StaggerText({
  parts,
  fontSize = 84,
  lineHeight = 1.2,
  delay = 0,
  color = COLORS.ink,
  align = "left",
  style,
}: {
  parts: TextPart[];
  fontSize?: number;
  lineHeight?: number;
  delay?: number;
  color?: string;
  align?: CSSProperties["textAlign"];
  style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  let index = 0;
  return (
    <div
      style={{
        fontFamily: FONT.sans,
        fontWeight: 700,
        fontSize,
        lineHeight,
        letterSpacing: "-0.03em",
        color,
        textAlign: align,
        ...style,
      }}
    >
      {parts.map((part, partIndex) => {
        const segments = part.text.split("\n");
        return segments.map((segment, segmentIndex) => {
          const tokens = tokenize(segment);
          return (
            <span key={`${segment}-${partIndex}-${segmentIndex}`}>
              {segmentIndex > 0 ? <br /> : null}
              <span
                style={{
                  display: "inline-block",
                  fontFamily: part.serif ? FONT.serif : FONT.sans,
                  fontStyle: part.serif ? "italic" : "normal",
                  fontWeight: part.serif ? 400 : 700,
                  letterSpacing: part.serif ? "0.01em" : "-0.03em",
                  color: part.color ?? color,
                  paddingRight: part.serif ? "0.06em" : undefined,
                  whiteSpace: "pre",
                }}
              >
                {tokens.map((token, tokenIndex) => {
                  const p = textSpring(frame, delay + index * 3);
                  index += 1;
                  return (
                    <span
                      key={`${token}-${tokenIndex}`}
                      style={{
                        display: "inline-block",
                        whiteSpace: "pre",
                        opacity: p,
                        transform: `translateY(${(1 - p) * 40}px)`,
                      }}
                    >
                      {token}
                    </span>
                  );
                })}
              </span>
            </span>
          );
        });
      })}
    </div>
  );
}

export function MonoLabel({
  children,
  color = COLORS.muted,
  size = 24,
  style,
}: {
  children: ReactNode;
  color?: string;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        fontFamily: FONT.mono,
        fontSize: size,
        fontWeight: 400,
        letterSpacing: "0.08em",
        color,
        whiteSpace: "pre",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** 页眉：品牌 + 分镜编号，全片统一。 */
export function Eyebrow({ index, label, dark = false }: { index: string; label: string; dark?: boolean }) {
  const color = dark ? "rgba(255,255,255,0.62)" : COLORS.muted;
  return (
    <div
      style={{
        position: "absolute",
        top: LAYOUT.eyebrow.top,
        left: LAYOUT.eyebrow.left,
        right: LAYOUT.eyebrow.right,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
      }}
    >
      <MonoLabel color={dark ? "rgba(255,255,255,0.78)" : COLORS.inkSoft}>Thinkly</MonoLabel>
      <MonoLabel color={color}>
        {index}
        {"  "}
        {label}
      </MonoLabel>
    </div>
  );
}
