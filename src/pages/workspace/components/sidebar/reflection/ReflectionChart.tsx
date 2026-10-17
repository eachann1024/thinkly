import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/reflection/ReflectionChart.tsx#localMessages:1">`
zh-Hans:
  trend: "近 4 周每天的编辑次数"
en:
  trend: "Daily edits over the last 4 weeks"
`;
const uiText = createTranslator(localMessages);

const WIDTH = 320;
const HEIGHT = 72;
const PAD = 4;

/** weeks：旧到新，每周 7 个值；最后一周用强调色。 */
export function ReflectionChart({ weeks }: { weeks: number[][] }) {
  const values = weeks.flat();
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const step = (WIDTH - PAD * 2) / (values.length - 1);
  const points = values.map((v, i) => ({
    x: PAD + i * step,
    y: HEIGHT - PAD - (v / max) * (HEIGHT - PAD * 2),
  }));
  const toLine = (list: typeof points) => list.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const lastWeekStart = values.length - 7;
  return (
    <svg
      role="img"
      aria-label={uiText("trend")}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-[72px] w-full"
    >
      {weeks.slice(1).map((_, i) => {
        const x = PAD + (i + 1) * 7 * step - step / 2;
        return <line key={i} x1={x} x2={x} y1={PAD} y2={HEIGHT - PAD} className="stroke-border" strokeWidth={1} />;
      })}
      <line x1={PAD} x2={WIDTH - PAD} y1={HEIGHT - PAD} y2={HEIGHT - PAD} className="stroke-border" strokeWidth={1} />
      <polyline
        points={toLine(points)}
        fill="none"
        className="stroke-muted-foreground"
        strokeWidth={1.25}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.55}
      />
      <polyline
        points={toLine(points.slice(lastWeekStart))}
        fill="none"
        className="stroke-[var(--goose-accent-solid)]"
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
