import type { CSSProperties, ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { C } from "../theme";
import { Icon } from "./Icons";
import { Fill } from "./Skeleton";

export const BODY = { size: 17, line: 26 };

/** 编辑器纸面：标准宽 720，左右留白随可用宽度收放。 */
export function Page({ children, width = 720, top = 40 }: { children: ReactNode; width?: number; top?: number }) {
  return (
    <div style={{ position: "absolute", inset: 0, paddingTop: top }}>
      <div style={{ width, maxWidth: "calc(100% - 48px)", margin: "0 auto", position: "relative" }}>{children}</div>
    </div>
  );
}

export function Title({ children, t = 1 }: { children: ReactNode; t?: number }) {
  return (
    <Fill t={t} bar={0.62} width="62%" style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 40, lineHeight: "50px", fontWeight: 650, letterSpacing: "-0.01em" }}>{children}</div>
    </Fill>
  );
}

export function Lead({ children, t = 1 }: { children: ReactNode; t?: number }) {
  return (
    <Fill t={t} width="56%" style={{ marginBottom: 22 }}>
      <div
        style={{
          fontSize: BODY.size,
          lineHeight: `${BODY.line}px`,
          color: C.text2,
          borderLeft: "3px solid #dcdcd8",
          paddingLeft: 14,
        }}
      >
        {children}
      </div>
    </Fill>
  );
}

export function H2({ children, t = 1, style }: { children: ReactNode; t?: number; style?: CSSProperties }) {
  return (
    <Fill t={t} bar={0.55} width="44%" style={{ margin: "18px 0 10px", ...style }}>
      <div style={{ fontSize: 24, lineHeight: "34px", fontWeight: 650 }}>{children}</div>
    </Fill>
  );
}

export function Para({ children, t = 1, lines = 2, style }: { children: ReactNode; t?: number; lines?: number; style?: CSSProperties }) {
  return (
    <Fill t={t} lines={lines} style={{ marginBottom: 6, ...style }}>
      <div style={{ fontSize: BODY.size, lineHeight: `${BODY.line}px` }}>{children}</div>
    </Fill>
  );
}

export function Check({ on = 0 }: { on?: number }) {
  return (
    <div
      style={{
        width: 17,
        height: 17,
        borderRadius: 4,
        flex: "none",
        border: `1.5px solid ${on > 0.5 ? C.accent : "#c4c3be"}`,
        background: on > 0.5 ? C.selected : C.paper,
        display: "grid",
        placeItems: "center",
        transform: `scale(${1 + Math.sin(on * Math.PI) * 0.18})`,
      }}
    >
      {on > 0.5 ? <Icon name="check" size={13} color={C.accent} stroke={2.6} /> : null}
    </div>
  );
}

export function Todo({ children, on = 0, t = 1 }: { children: ReactNode; on?: number; t?: number }) {
  return (
    <Fill t={t} width="48%" style={{ height: BODY.line + 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, height: BODY.line + 6, fontSize: BODY.size }}>
        <Check on={on} />
        <span style={{ color: on > 0.5 ? C.text3 : C.text, transition: "none" }}>{children}</span>
      </div>
    </Fill>
  );
}

/** 行首悬浮的块操作胶囊：加号、折叠、拖拽把手。 */
export function SideMenu({ opacity = 1, grab = false }: { opacity?: number; grab?: boolean }) {
  const btn = (child: ReactNode, on = false) => (
    <div
      style={{
        width: 24,
        height: 22,
        borderRadius: 7,
        display: "grid",
        placeItems: "center",
        background: on ? C.hover : "transparent",
      }}
    >
      {child}
    </div>
  );
  return (
    <div
      style={{
        position: "absolute",
        right: "100%",
        top: "50%",
        marginRight: 10,
        transform: "translateY(-50%)",
        display: "flex",
        padding: 3,
        borderRadius: 10,
        background: C.menu,
        boxShadow: "0 0 0 1px rgba(31,30,29,0.08), 0 1px 3px rgba(31,30,29,0.06)",
        opacity,
      }}
    >
      {btn(<Icon name="plus" size={14} color={C.text2} />)}
      {btn(<Icon name="grip" size={14} color={C.text2} stroke={2.4} />, grab)}
    </div>
  );
}

export function Caret({ height = 22 }: { height?: number }) {
  const frame = useCurrentFrame();
  const on = Math.floor(frame / 30) % 2 === 0;
  return (
    <span
      style={{
        display: "inline-block",
        width: 2,
        height,
        marginLeft: 1,
        verticalAlign: "middle",
        background: C.text,
        opacity: on ? 1 : 0,
      }}
    />
  );
}
