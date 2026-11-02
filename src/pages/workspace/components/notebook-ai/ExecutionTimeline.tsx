import type { CSSProperties } from "react";
import { useLocale, i18nYaml, createTranslator } from "@/i18n";
import { formatExecutionTime, type ExecutionSegment, type ExecutionStage } from "./executionPresentation";
import type { OutputSpeed } from "./useOutputSpeed";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/ExecutionTimeline.tsx#messages:1">`
zh-Hans:
  live: "实时"
  average: "平均"
  peak: "峰值"
  unit: "字/秒"
en:
  live: "Live"
  average: "Average"
  peak: "Peak"
  unit: "chars/s"
ja:
  live: "リアルタイム"
  average: "平均"
  peak: "ピーク"
  unit: "文字/秒"
`;
const t = createTranslator(messages);

const ORDER: ExecutionStage[] = ["read", "write", "visual", "response"];
const TICK_STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
const CHART_HEIGHT = 40;

function axisTicks(spanSeconds: number) {
  const step = TICK_STEPS.find(value => spanSeconds / value <= 5) ?? 600;
  const ticks: number[] = [];
  for (let second = 0; second <= spanSeconds; second += step) ticks.push(second);
  return ticks;
}

function SpeedChart({ speed, startedAt, span }: { speed: OutputSpeed; startedAt: number; span: number }) {
  const top = Math.max(10, speed.peak) * 1.1;
  const y = (rate: number) => (CHART_HEIGHT - 3 - (rate / top) * (CHART_HEIGHT - 6)).toFixed(2);
  const points = speed.points.map(point => `${(((point.at - startedAt) / span) * 100).toFixed(2)},${y(point.rate)}`).join(" ");
  return <svg className="notebook-ai-timeline-chart" viewBox={`0 0 100 ${CHART_HEIGHT}`} preserveAspectRatio="none" aria-hidden>
    <line className="notebook-ai-timeline-avg" x1="0" x2="100" y1={y(speed.average)} y2={y(speed.average)} vectorEffect="non-scaling-stroke" />
    <polyline className="notebook-ai-timeline-line" points={points} vectorEffect="non-scaling-stroke" />
  </svg>;
}

export function ExecutionTimeline({ segments, startedAt, now, running, speed, stageLabel }: {
  segments: ExecutionSegment[]; startedAt: number; now: number; running: boolean;
  speed: OutputSpeed | null; stageLabel: (stage: ExecutionStage) => string;
}) {
  const locale = useLocale();
  const elapsed = Math.max(1000, now - startedAt);
  // Leave headroom on the right while running so the "now" cursor has room to travel.
  const span = running ? Math.max(10000, elapsed * 1.14) : elapsed;
  const stages = ORDER.filter(stage => segments.some(segment => segment.stage === stage));
  const showChart = !!speed && speed.points.length > 1;
  const pct = (ms: number) => `${(ms / span) * 100}%`;
  const rate = (value: number) => Math.round(value).toLocaleString(locale);
  return <div className="notebook-ai-timeline" style={{ "--now": elapsed / span } as CSSProperties}>
    {speed ? <dl className="notebook-ai-timeline-stats">
      {running ? <div data-live><dt>{t("live")}</dt><dd>{rate(speed.live)}<small> {t("unit")}</small></dd></div> : null}
      <div><dt>{t("average")}</dt><dd>{rate(speed.average)}<small> {t("unit")}</small></dd></div>
      <div><dt>{t("peak")}</dt><dd>{rate(speed.peak)}<small> {t("unit")}</small></dd></div>
    </dl> : null}
    <div className="notebook-ai-timeline-rows">
      {stages.map(stage => {
        const total = segments.reduce((sum, segment) => segment.stage === stage ? sum + segment.end - segment.start : sum, 0);
        return <div key={stage} className="notebook-ai-timeline-row" data-stage={stage}>
          <div className="notebook-ai-timeline-label"><span>{stageLabel(stage)}</span><time>{formatExecutionTime(total, locale)}</time></div>
          <div className="notebook-ai-timeline-track" aria-hidden>
            {segments.filter(segment => segment.stage === stage).map(segment =>
              <span key={segment.start} className="notebook-ai-timeline-bar"
                style={{ left: pct(segment.start - startedAt), width: pct(segment.end - segment.start) }} />)}
          </div>
        </div>;
      })}
      {showChart ? <div className="notebook-ai-timeline-row">
        <div className="notebook-ai-timeline-label"><span>{t("unit")}</span></div>
        <div className="notebook-ai-timeline-track notebook-ai-timeline-track--chart" aria-hidden>
          <SpeedChart speed={speed} startedAt={startedAt} span={span} />
        </div>
      </div> : null}
      {running ? <span className="notebook-ai-timeline-cursor" aria-hidden /> : null}
    </div>
    <div className="notebook-ai-timeline-axis" aria-hidden>
      <div>{axisTicks(span / 1000).map(second => <span key={second} style={{ left: pct(second * 1000) }}>{second}s</span>)}</div>
    </div>
  </div>;
}
