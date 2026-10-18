import type { CSSProperties, ReactNode } from "react";
import { COLORS, FONT } from "../theme";

export const CARD_SHADOW = "0 10px 22px rgba(27, 26, 23, 0.10)";
export const CARD_BORDER = "1px solid rgba(27, 26, 23, 0.12)";

export function Window({
  title,
  children,
  style,
  chrome = true,
}: {
  title?: string;
  children?: ReactNode;
  style?: CSSProperties;
  chrome?: boolean;
}) {
  return (
    <div
      style={{
        background: COLORS.surface,
        border: CARD_BORDER,
        borderRadius: 20,
        boxShadow: CARD_SHADOW,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      {chrome ? (
        <div
          style={{
            height: 56,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "0 22px",
            borderBottom: CARD_BORDER,
            flex: "0 0 auto",
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{ width: 11, height: 11, borderRadius: 999, background: "rgba(27,26,23,0.18)" }}
              />
            ))}
          </div>
          {title ? (
            <div style={{ fontFamily: FONT.sans, fontSize: 19, color: COLORS.muted, letterSpacing: "0.01em" }}>
              {title}
            </div>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function Panel({
  children,
  style,
  active = false,
}: {
  children?: ReactNode;
  style?: CSSProperties;
  active?: boolean;
}) {
  return (
    <div
      style={{
        background: active ? COLORS.white : "rgba(255,255,255,0.55)",
        border: active ? `1.5px solid ${COLORS.accent}` : CARD_BORDER,
        borderRadius: 14,
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** 纸面条目：不透明灰条代表正文行，宽度可变。 */
export function Bar({
  width,
  height = 12,
  color = "rgba(27,26,23,0.20)",
  style,
}: {
  width: number | string;
  height?: number;
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <div style={{ width, height, borderRadius: height / 2, background: color, ...style }} />
  );
}

export function Chip({
  children,
  active = false,
  style,
}: {
  children: ReactNode;
  active?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: 34,
        padding: "0 14px",
        borderRadius: 10,
        fontFamily: FONT.mono,
        fontSize: 18,
        letterSpacing: "0.06em",
        color: active ? COLORS.white : COLORS.inkSoft,
        background: active ? COLORS.accent : "rgba(255,255,255,0.7)",
        border: active ? "1px solid transparent" : CARD_BORDER,
        whiteSpace: "pre",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Keycap({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: 46,
        padding: "0 16px",
        borderRadius: 12,
        background: COLORS.white,
        border: "1px solid rgba(27,26,23,0.18)",
        boxShadow: "0 3px 0 rgba(27,26,23,0.10)",
        fontFamily: FONT.mono,
        fontSize: 20,
        letterSpacing: "0.06em",
        color: COLORS.ink,
        whiteSpace: "pre",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** 勾选：唯一强调色的小物件。 */
export function Check({ size = 20, color = COLORS.accent }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M4 10.6 8.2 14.8 16 6.2"
        fill="none"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BodyText({
  children,
  size = 22,
  color = COLORS.inkSoft,
  weight = 400,
  style,
}: {
  children: ReactNode;
  size?: number;
  color?: string;
  weight?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        fontFamily: FONT.sans,
        fontSize: size,
        fontWeight: weight,
        lineHeight: 1.5,
        color,
        letterSpacing: "-0.01em",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
