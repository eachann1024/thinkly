import { useLocale } from "@/i18n";
import { useState } from "react";
import { createTranslator, i18nYaml } from "@/i18n";
import { getFormatLocale } from "@/i18n/runtime";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { TrendPoint } from "@/lib/reflection/reflectionStats";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/reflection/ReflectionTrend.tsx#localMessages:1">`
zh-Hans:
  edits: "编辑次数"
  added: "新增字数"
  trend: "编辑趋势"
en:
  edits: "Edits"
  added: "Characters added"
  trend: "Edit trend"
`;
const uiText = createTranslator(localMessages);

type Metric = "edits" | "added";

const WIDTH = 640;
const HEIGHT = 200;
const LEFT = 40;
const RIGHT = 8;
const TOP = 8;
const BOTTOM = 26;
const GRID_LINES = 4;
const X_TICKS = 5;

/** 向上取整到 1/2/5 × 10^k，使 4 等分刻度为整数。 */
function niceMax(max: number): number {
  const raw = Math.max(max, GRID_LINES) / GRID_LINES;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const unit = [1, 2, 5, 10].find((u) => u * pow >= raw) ?? 10;
  return unit * pow * GRID_LINES;
}

export function ReflectionTrend({ points }: { points: TrendPoint[] }) {
  useLocale();
  const [metric, setMetric] = useState<Metric>("edits");
  const [hover, setHover] = useState<number | null>(null);
  const locale = getFormatLocale();
  const values = points.map((p) => p[metric]);
  const top = niceMax(Math.max(0, ...values));
  const plotW = WIDTH - LEFT - RIGHT;
  const plotH = HEIGHT - TOP - BOTTOM;
  const x = (i: number) => LEFT + (points.length > 1 ? (i / (points.length - 1)) * plotW : plotW / 2);
  const y = (v: number) => TOP + plotH - (v / top) * plotH;
  const number = new Intl.NumberFormat(locale, { notation: "compact" });
  const date = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  const tickIndexes = Array.from(
    new Set(Array.from({ length: Math.min(X_TICKS, points.length) }, (_, k) =>
      Math.round((k * (points.length - 1)) / Math.max(1, Math.min(X_TICKS, points.length) - 1)))),
  );
  const full = new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" });
  const onMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (points.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const index = points.length > 1 ? Math.round(((px - LEFT) / plotW) * (points.length - 1)) : 0;
    setHover(Math.min(points.length - 1, Math.max(0, index)));
  };
  const active = hover !== null && hover < points.length ? hover : null;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-4">
        <h3 className="text-sm font-medium text-foreground">{uiText("trend")}</h3>
        <SegmentedControl
          className="gap-1"
          aria-label={uiText("trend")}
          value={metric}
          onValueChange={(value) => setMetric(value as Metric)}
          options={[
            { value: "edits", label: uiText("edits") },
            { value: "added", label: uiText("added") },
          ]}
        />
      </div>
      <div className="relative">
      <svg role="img" aria-label={uiText("trend")} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {Array.from({ length: GRID_LINES + 1 }, (_, k) => {
          const value = (top / GRID_LINES) * k;
          return (
            <g key={k}>
              <line x1={LEFT} x2={WIDTH - RIGHT} y1={y(value)} y2={y(value)} className="stroke-border" strokeWidth={1} />
              <text x={LEFT - 8} y={y(value)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground" fontSize={11}>
                {number.format(value)}
              </text>
            </g>
          );
        })}
        {tickIndexes.map((i, k) => (
          <text
            key={i}
            x={x(i)}
            y={HEIGHT - 8}
            textAnchor={k === 0 ? "start" : k === tickIndexes.length - 1 ? "end" : "middle"}
            className="fill-muted-foreground"
            fontSize={11}
          >
            {date.format(points[i].start)}
          </text>
        ))}
        <polyline
          points={values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}
          fill="none"
          className="stroke-[var(--goose-accent-solid)]"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {active !== null && (
          <line x1={x(active)} x2={x(active)} y1={TOP} y2={TOP + plotH} className="stroke-border" strokeWidth={1} />
        )}
        {values.map((v, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(v)}
            r={i === active ? 5 : 3}
            className="fill-[var(--goose-accent-solid)] stroke-[var(--goose-menu-surface)]"
            strokeWidth={i === active ? 2 : 0}
          />
        ))}
      </svg>
      {active !== null && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-border bg-[var(--goose-menu-surface)] px-2 py-1 text-xs text-foreground shadow-md"
          style={{
            left: `${(Math.min(Math.max(x(active), 60), WIDTH - 60) / WIDTH) * 100}%`,
            top: `calc(${((y(values[active]) / HEIGHT) * 100).toFixed(2)}% - 10px)`,
          }}
        >
          <span className="text-muted-foreground">{full.format(points[active].start)}</span>
          <span className="goose-tabular ml-2 font-medium">{values[active].toLocaleString(locale)}</span>
        </div>
      )}
      </div>
    </div>
  );
}
