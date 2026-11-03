import { getFormatLocale } from "@/i18n/runtime";
import type { TrendPoint } from "@/lib/reflection/reflectionStats";

export function ReflectionTrendChart({ points, label }: { points: TrendPoint[]; label: string }) {
  const locale = getFormatLocale();
  const date = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  const max = Math.max(1, ...points.map((point) => point.edits));
  return (
    <section aria-label={label}>
      <h3 className="mb-2.5 text-sm font-medium text-foreground">{label}</h3>
      <div
        role="img"
        aria-label={label}
        className="flex h-[72px] items-end gap-[3px] border-b border-border"
      >
        {points.map((point) => {
          const peak = point.edits === max && point.edits > 0;
          return (
            <span
              key={point.start}
              className={peak ? "bg-[var(--goose-accent-solid)]" : "bg-[color-mix(in_srgb,var(--goose-accent-solid)_45%,var(--goose-shell-bg))]"}
              style={{
                flex: "1 1 0",
                minWidth: 2,
                height: Math.max(4, Math.round((point.edits / max) * 68)),
                borderRadius: "2px 2px 0 0",
              }}
            />
          );
        })}
      </div>
      {points.length > 0 ? (
        <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-muted-foreground">
          <span>{date.format(points[0].start)}</span>
          <span>{date.format(points[points.length - 1].start)}</span>
        </div>
      ) : null}
    </section>
  );
}
