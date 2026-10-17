import type { CSSProperties, ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { COLORS, FONT } from "../theme";
import { textSpring } from "../motion";

export type TextPart = { text: string; serif?: boolean; color?: string };

const TOKEN = /[A-Za-z0-9@#%&+_.:'’\-]+|[一-鿿]{1,2}|[^\s]/g;

function tokenize(text: string): string[] {
  return text.match(TOKEN) ?? [];
}

/** 逐词上浮，3 帧一词；混排衬线斜体。 */
export function StaggerText({
  parts,
  fontSize = 88,
  lineHeight = 1.18,
  delay = 0,
  weight = 700,
  color = COLORS.ink,
  align = "left",
  letterSpacing = "-0.03em",
  style,
}: {
  parts: TextPart[];
  fontSize?: number;
  lineHeight?: number;
  delay?: number;
  weight?: number;
  color?: string;
  align?: CSSProperties["textAlign"];
  letterSpacing?: string;
  style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  let index = 0;
  return (
    <div
      style={{
        fontFamily: FONT.sans,
        fontWeight: weight,
        fontSize,
        lineHeight,
        letterSpacing,
        color,
        textAlign: align,
        ...style,
      }}
    >
      {parts.map((part, partIndex) => {
        const tokens = tokenize(part.text);
        return (
          <span
            key={`${part.text}-${partIndex}`}
            style={{
              display: "inline-block",
              fontFamily: part.serif ? FONT.serif : FONT.sans,
              fontStyle: part.serif ? "italic" : "normal",
              fontWeight: part.serif ? 400 : weight,
              letterSpacing: part.serif ? "0" : letterSpacing,
              color: part.color ?? color,
              paddingRight: part.serif ? "0.08em" : undefined,
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
        );
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
        textTransform: "uppercase",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** 全片统一的页眉标注，不属于说明性小字。 */
export function Eyebrow({ right }: { right: string }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 96,
        left: 96,
        right: 96,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
      }}
    >
      <MonoLabel color={COLORS.inkSoft}>Thinkly</MonoLabel>
      <MonoLabel>{right}</MonoLabel>
    </div>
  );
}
