import type { CSSProperties, ReactNode } from "react";
import { COLORS, FONT, SHEET } from "../../theme";
import {
  ChevronIcon,
  FolderIcon,
  SearchIcon,
  TypeIcon,
} from "../Icons";

export const QUERY = "上周会议定了什么？";
export const TERMS = ["上周", "会议", "周会"];

export function Mark({ children }: { children: ReactNode }) {
  return (
    <mark
      style={{
        color: "inherit",
        background: COLORS.accentWash,
        borderRadius: 3,
        boxShadow: `inset 0 0 0 1px ${COLORS.accent}73`,
        padding: "0 2px",
      }}
    >
      {children}
    </mark>
  );
}

export function Highlight({ text }: { text: string }) {
  const pattern = new RegExp(`(${TERMS.join("|")})`, "g");
  return (
    <>
      {text.split(pattern).map((chunk, index) =>
        TERMS.includes(chunk) ? <Mark key={index}>{chunk}</Mark> : <span key={index}>{chunk}</span>,
      )}
    </>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 42,
        height: 32,
        padding: "0 10px",
        border: `1px solid ${COLORS.border}`,
        borderRadius: 6,
        fontFamily: FONT.mono,
        fontSize: 20,
        color: COLORS.muted,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export function SheetShell({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        position: "absolute",
        left: SHEET.left,
        width: SHEET.width,
        height: SHEET.height,
        borderRadius: `${SHEET.radius}px ${SHEET.radius}px 0 0`,
        border: `1px solid ${COLORS.border}`,
        borderBottom: "none",
        background: COLORS.surface,
        backgroundImage: "radial-gradient(rgba(27,26,23,0.035) 1px, transparent 1px)",
        backgroundSize: "6px 6px",
        boxShadow: "0 -8px 24px rgba(27,26,23,0.10)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function QueryRow() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "4px 40px 16px",
        color: COLORS.muted,
      }}
    >
      <SearchIcon size={32} color={COLORS.muted} />
      <span
        style={{
          flex: 1,
          fontFamily: FONT.sans,
          fontSize: 34,
          color: COLORS.ink,
          letterSpacing: "-0.01em",
        }}
      >
        {QUERY}
      </span>
      <Kbd>Esc</Kbd>
    </div>
  );
}

export function Filters() {
  const chip: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    height: 46,
    padding: "0 14px",
    borderRadius: 8,
    fontFamily: FONT.sans,
    fontSize: 25,
    color: COLORS.muted,
    whiteSpace: "nowrap",
  };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 32px 14px",
        borderBottom: `1px solid ${COLORS.borderSoft}`,
      }}
    >
      <span style={chip}>
        <FolderIcon />
        所有笔记本
        <ChevronIcon />
      </span>
      <span style={chip}>
        <TypeIcon />
        仅搜索标题
      </span>
      <span style={chip}>
        最佳匹配
        <ChevronIcon />
      </span>
      <span style={{ flex: 1 }} />
      <span style={{ fontFamily: FONT.sans, fontSize: 23, color: COLORS.muted }}>12 篇</span>
    </div>
  );
}

export function SheetFooter() {
  return (
    <div
      style={{
        marginTop: "auto",
        display: "flex",
        alignItems: "center",
        gap: 26,
        height: 70,
        padding: "0 32px",
        borderTop: `1px solid ${COLORS.borderSoft}`,
        fontFamily: FONT.sans,
        fontSize: 22,
        color: COLORS.muted,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          height: 36,
          padding: "0 12px",
          borderRadius: 5,
          background: COLORS.accent,
          color: COLORS.white,
          fontSize: 21,
          fontWeight: 500,
        }}
      >
        所有笔记本
      </span>
      <span>↑↓ 选择</span>
      <span>↵ 打开</span>
      <span>Tab 切换范围</span>
      <span style={{ marginLeft: "auto" }}>Esc 关闭</span>
    </div>
  );
}
