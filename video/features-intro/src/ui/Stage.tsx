import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, FONT_MONO, FONT_UI, HEIGHT, WIDTH, lerp, pop, ramp } from "../theme";
import { WIN } from "./Window";

export const WIN_BOX = (() => {
  const w = WIN.w * WIN.scale;
  const h = WIN.h * WIN.scale;
  return { w, h, left: (WIDTH - w) / 2, top: HEIGHT - h - 36 };
})();

/** 窗口内坐标换算到画面坐标。 */
export function toScreen(x: number, y: number) {
  return { x: WIN_BOX.left + x * WIN.scale, y: WIN_BOX.top + y * WIN.scale };
}

export function Backdrop() {
  return (
    <AbsoluteFill
      style={{
        background: C.stage,
        backgroundImage: "radial-gradient(rgba(31,30,29,0.07) 1px, transparent 1.2px)",
        backgroundSize: "24px 24px",
      }}
    />
  );
}

export function Caption({ num, title, line, len }: { num: string; title: string; line: string; len: number }) {
  const f = useCurrentFrame();
  const a = pop(f, 4, 20);
  const b = pop(f, 12, 20);
  const out = ramp(f, len - 16, len - 2);
  return (
    <div
      style={{
        position: "absolute",
        left: WIN_BOX.left + 4,
        top: 0,
        height: WIN_BOX.top,
        display: "flex",
        alignItems: "center",
        gap: 22,
        fontFamily: FONT_UI,
        opacity: 1 - out,
        transform: `translateY(${-out * 10}px)`,
      }}
    >
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 22,
          letterSpacing: "0.08em",
          color: C.accent,
          opacity: a,
          transform: `translateY(${(1 - a) * 18}px)`,
        }}
      >
        {num}
      </span>
      <span
        style={{
          fontSize: 44,
          fontWeight: 680,
          letterSpacing: "-0.02em",
          color: C.text,
          opacity: a,
          transform: `translateY(${(1 - a) * 18}px)`,
        }}
      >
        {title}
      </span>
      <span
        style={{
          fontSize: 28,
          fontWeight: 420,
          color: C.text2,
          opacity: b,
          transform: `translateY(${(1 - b) * 18}px)`,
        }}
      >
        {line}
      </span>
    </div>
  );
}

export type Cam = { t: number; zoom: number; x: number; y: number };

/** 窗口固定在画面下方；cam 以窗口内某点为中心少量推近。 */
export function Placed({
  children,
  cam,
  y = 0,
  scale = 1,
  opacity = 1,
}: {
  children: ReactNode;
  cam?: Cam;
  y?: number;
  scale?: number;
  opacity?: number;
}) {
  const t = cam?.t ?? 0;
  const zoom = lerp(1, cam?.zoom ?? 1, t) * scale;
  const cx = lerp(WIN.w / 2, cam?.x ?? WIN.w / 2, t);
  const cy = lerp(WIN.h / 2, cam?.y ?? WIN.h / 2, t);
  return (
    <div
      style={{
        position: "absolute",
        left: WIN_BOX.left,
        top: WIN_BOX.top + y,
        width: WIN.w,
        height: WIN.h,
        transformOrigin: "0 0",
        transform: `scale(${WIN.scale}) translate(${WIN.w / 2}px, ${WIN.h / 2}px) scale(${zoom}) translate(${-cx}px, ${-cy}px)`,
        opacity,
      }}
    >
      {children}
    </div>
  );
}
