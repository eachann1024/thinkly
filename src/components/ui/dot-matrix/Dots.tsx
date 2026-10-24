import { memo, type CSSProperties, type ReactNode } from "react";
import type { Dot } from "./geometry";
import { entryIndex, loopVars, type DotLoop } from "./motion";

const ACCENT_FILL = "var(--goose-accent-solid)";

export const Dots = memo(function Dots({ dots }: { dots: Dot[] }) {
  return dots.map((dot, index) => (
    <circle
      key={index}
      cx={dot.x.toFixed(2)}
      cy={dot.y.toFixed(2)}
      r={dot.r.toFixed(2)}
      opacity={dot.o.toFixed(3)}
      fill={dot.accent ? ACCENT_FILL : "currentColor"}
    />
  ));
});

export const DotGroup = memo(function DotGroup({
  dots,
  children,
  enter = 0,
  loop,
  delay,
  period,
}: {
  dots?: Dot[];
  children?: ReactNode;
  enter?: number | false;
  loop?: DotLoop;
  delay?: number;
  period?: number;
}) {
  const body = (
    <>
      {dots ? <Dots dots={dots} /> : null}
      {children}
    </>
  );
  const inner = loop ? (
    <g className={`goose-dm-${loop}`} style={loopVars({ delay, period, loop })}>
      {body}
    </g>
  ) : (
    body
  );
  if (enter === false) return inner;
  return (
    <g
      className="goose-dm-rg"
      style={{ "--dm-i": entryIndex(enter) } as CSSProperties}
    >
      {inner}
    </g>
  );
});
