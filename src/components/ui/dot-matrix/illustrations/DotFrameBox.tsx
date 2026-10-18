import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DotGroup } from "../Dots";
import { DotMatrixMotion } from "../DotMatrixMotion";
import { line, ringBuckets, sample, type Dot, type Segment } from "../geometry";
import { rippleDelay } from "../motion";

const RADIUS = 8;
const GAP = 5;
const INSET = 1;
const RINGS = 8;
const PERIOD = 12;

/** 圆角矩形周长等距取点，按周长序号分段：明暗沿边框缓慢绕行。 */
function buildFrame(w: number, h: number) {
  const L = INSET, T = INSET, R = w - INSET, B = h - INSET, r = RADIUS, k = 0.5523 * r;
  const segs: Segment[] = [
    line([L + r, T], [R - r, T]),
    [[R - r, T], [R - r + k, T], [R, T + r - k], [R, T + r]],
    line([R, T + r], [R, B - r]),
    [[R, B - r], [R, B - r + k], [R - r + k, B], [R - r, B]],
    line([R - r, B], [L + r, B]),
    [[L + r, B], [L + r - k, B], [L, B - r + k], [L, B - r]],
    line([L, B - r], [L, T + r]),
    [[L, T + r], [L, T + r - k], [L + r - k, T], [L + r, T]],
  ];
  const dots: Dot[] = sample(segs, GAP).map(([x, y]) => ({ x, y, r: 0.8, o: 0.32 }));
  const order = new Map(dots.map((d, n) => [d, n]));
  return ringBuckets(dots, { cx: 0, cy: 0, n: RINGS, dist: (d) => order.get(d) ?? 0 });
}

/** 点阵圆角虚框容器：按实际尺寸生成边框点，内容叠在上方。 */
export function DotFrameBox({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<[number, number]>([0, 0]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
      setSize((prev) => (prev[0] === w && prev[1] === h ? prev : [w, h]));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [w, h] = size;
  const rings = useMemo(() => (w > 2 * RADIUS && h > 2 * RADIUS ? buildFrame(w, h) : []), [w, h]);
  return (
    <div ref={ref} className={cn("relative rounded-lg", className)}>
      {rings.length > 0 && (
        <DotMatrixMotion
          width={w}
          height={h}
          origin={[0, 0]}
          className="pointer-events-none absolute inset-0 text-foreground"
        >
          {rings.map(({ index, dots }) => (
            <DotGroup
              key={index}
              dots={dots}
              enter={index}
              loop="ripple"
              period={PERIOD}
              delay={rippleDelay(index, RINGS, PERIOD)}
            />
          ))}
        </DotMatrixMotion>
      )}
      {children}
    </div>
  );
}
