import type { CSSProperties, ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { C } from "../theme";

export function Skel({
  w = "100%",
  h = 12,
  r = 6,
  style,
}: {
  w?: number | string;
  h?: number;
  r?: number;
  style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  const x = ((frame * 9) % 900) - 300;
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: r,
        flex: "none",
        backgroundColor: C.skeleton,
        backgroundImage: `linear-gradient(100deg, transparent 0, ${C.skeletonHi} 120px, transparent 240px)`,
        backgroundSize: "900px 100%",
        backgroundRepeat: "no-repeat",
        backgroundPosition: `${x}px 0`,
        ...style,
      }}
    />
  );
}

/**
 * 内容与骨架交叉显隐：t=0 为骨架，t=1 为真实内容。
 * 骨架条按 lines 均分高度，末行收短。
 */
export function Fill({
  t,
  lines = 1,
  bar = 0.5,
  last = 0.62,
  width = "100%",
  children,
  style,
}: {
  t: number;
  lines?: number;
  bar?: number;
  last?: number;
  width?: number | string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div style={{ position: "relative", ...style }}>
      <div style={{ opacity: t, transform: `translateY(${(1 - t) * 4}px)` }}>{children}</div>
      {t < 1 ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-around",
            opacity: 1 - t,
          }}
        >
          {Array.from({ length: lines }, (_, i) => (
            <Skel
              key={i}
              w={i === lines - 1 && lines > 1 ? `${last * 100}%` : width}
              h={0}
              style={{ height: `${(bar / lines) * 100}%` }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
