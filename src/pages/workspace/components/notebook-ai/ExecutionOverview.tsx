import { useLocale, i18nYaml, createTranslator } from "@/i18n";
import { formatExecutionTime, type ExecutionSegment, type ExecutionStage } from "./executionPresentation";
import type { OutputSpeed } from "./useOutputSpeed";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/ExecutionOverview.tsx#messages:1">`
zh-Hans:
  read: "读取"
  write: "工具处理"
  visual: "可视化"
  wait: "等模型"
  think: "思考"
  compose: "撰写"
  response: "响应"
  nowFirstWait: "{{model}} 还没开口"
  nowWait: "等 {{model}} 继续"
  nowThink: "模型在思考"
  nowCompose: "正在撰写"
  nowRead: "正在读取"
  nowWrite: "正在处理"
  nowVisual: "正在生成可视化"
  nowResponse: "正在响应"
  detailFirstWait: "请求已发出，正在等模型回第一个字"
  detailWait: "结果已交给模型，正在等它接着往下做"
  detailCompose: "已生成 {{chars}} 字 · {{rate}} 字/秒"
  slow: "等得比较久了，可以停止后重试"
  longest: "最久的是{{stage}}，{{time}}"
  live: "进行中"
en:
  read: "Reading"
  write: "Tools"
  visual: "Visualization"
  wait: "Waiting"
  think: "Thinking"
  compose: "Writing"
  response: "Response"
  nowFirstWait: "{{model}} hasn't started yet"
  nowWait: "Waiting for {{model}} to continue"
  nowThink: "The model is thinking"
  nowCompose: "Writing"
  nowRead: "Reading"
  nowWrite: "Working"
  nowVisual: "Building a visual"
  nowResponse: "Responding"
  detailFirstWait: "Request sent; waiting for the model's first word"
  detailWait: "Results handed to the model; waiting for it to go on"
  detailCompose: "{{chars}} characters · {{rate}} chars/s"
  slow: "This is taking a while. You can stop and retry."
  longest: "Most time went to {{stage}}: {{time}}"
  live: "Now"
ja:
  read: "読み取り"
  write: "ツール処理"
  visual: "可視化"
  wait: "モデル待ち"
  think: "思考"
  compose: "執筆"
  response: "応答"
  nowFirstWait: "{{model}} はまだ応答していません"
  nowWait: "{{model}} の続きを待っています"
  nowThink: "モデルが考えています"
  nowCompose: "執筆中"
  nowRead: "読み取り中"
  nowWrite: "処理中"
  nowVisual: "可視化を作成中"
  nowResponse: "応答中"
  detailFirstWait: "リクエスト送信済み、最初の文字を待っています"
  detailWait: "結果をモデルに渡し、続きを待っています"
  detailCompose: "{{chars}} 文字 · {{rate}} 文字/秒"
  slow: "時間がかかっています。停止して再試行できます"
  longest: "最も長いのは{{stage}}：{{time}}"
  live: "進行中"
`;
const t = createTranslator(messages);

const ORDER: ExecutionStage[] = ["read", "write", "visual", "wait", "think", "compose", "response"];
const SLOW_WAIT = 20_000;
const NOW_KEY = {
  read: "nowRead", write: "nowWrite", visual: "nowVisual", think: "nowThink", compose: "nowCompose", response: "nowResponse",
} as const;

function headline(segments: ExecutionSegment[], model: string, detail: { thinking: string; step?: string; speed: OutputSpeed | null }, locale: string) {
  const current = segments[segments.length - 1];
  const stage = current.stage;
  if (stage === "wait") {
    const first = segments.length === 1;
    return { title: t(first ? "nowFirstWait" : "nowWait", { model }), detail: t(first ? "detailFirstWait" : "detailWait") };
  }
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const text = stage === "think" ? detail.thinking
    : stage === "compose" ? detail.speed ? t("detailCompose", { chars: number.format(detail.speed.total), rate: number.format(detail.speed.live) }) : ""
    : detail.step ?? "";
  return { title: t(NOW_KEY[stage]), detail: text };
}

export function ExecutionOverview({ segments, now, running, model, thinking, step, speed }: {
  segments: ExecutionSegment[]; now: number; running: boolean; model: string;
  thinking: string; step?: string; speed: OutputSpeed | null;
}) {
  const locale = useLocale();
  const totals = new Map<ExecutionStage, number>();
  for (const segment of segments) totals.set(segment.stage, (totals.get(segment.stage) ?? 0) + segment.end - segment.start);
  const current = segments[segments.length - 1];
  const stages = ORDER.filter(stage => (totals.get(stage) ?? 0) > 0 || (running && stage === current.stage));
  const elapsed = Math.max(0, now - current.start);
  const live = running ? headline(segments, model, { thinking, step, speed }, locale) : null;
  const longest = running ? undefined : stages.reduce<ExecutionStage | undefined>((best, stage) =>
    !best || totals.get(stage)! > totals.get(best)! ? stage : best, undefined);
  return <div className="notebook-ai-overview">
    {live ? <div className="notebook-ai-overview-now" aria-live="polite">
      <p className="notebook-ai-overview-title">{live.title}</p>
      {live.detail ? <p className="notebook-ai-overview-detail" title={live.detail}>{live.detail}</p> : null}
      <p className="notebook-ai-overview-clock">
        <time>{formatExecutionTime(elapsed, locale)}</time>
        {current.stage === "wait" && elapsed >= SLOW_WAIT ? <span>{t("slow")}</span> : null}
      </p>
    </div> : longest ? <p className="notebook-ai-overview-detail">
      {t("longest", { stage: t(longest), time: formatExecutionTime(totals.get(longest)!, locale) })}
    </p> : null}
    <div className="notebook-ai-overview-bar" aria-hidden="true">
      {segments.map((segment, index) => <span key={segment.start} data-stage={segment.stage}
        data-live={running && index === segments.length - 1 ? "" : undefined}
        style={{ flexGrow: Math.max(1, segment.end - segment.start) }} />)}
    </div>
    <dl className="notebook-ai-overview-legend">
      {stages.map(stage => <div key={stage} data-stage={stage} data-current={running && stage === current.stage ? "" : undefined}>
        <dt>{t(stage)}</dt>
        <dd>{formatExecutionTime(totals.get(stage) ?? 0, locale)}{running && stage === current.stage ? ` · ${t("live")}` : ""}</dd>
      </div>)}
    </dl>
  </div>;
}
