import { useLocale, createTranslator, i18nYaml } from "@/i18n";
import { useEffect, useRef, useState } from "react";
import { motion, useAnimationControls, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Pause, Play, RotateCcw } from "@/components/ui/icons";
import { shell } from "@/lib/electron-platform/shell";
import type { TimerCardData } from "@/lib/notebook-ai/cards/types";
import { CardRing } from "./CardProgress";
import { rowVariants } from "./cardMotion";

const messages = i18nYaml<"src/pages/workspace/components/ai-cards/TimerCard.tsx#messages:1">`
zh-Hans:
  start: "开始"
  pause: "暂停"
  resume: "继续"
  reset: "重置"
  finished: "{{title}} 时间到"
  timeUp: "时间到"
en:
  start: "Start"
  pause: "Pause"
  resume: "Resume"
  reset: "Reset"
  finished: "{{title}}: time’s up"
  timeUp: "Time’s up"
ja:
  start: "開始"
  pause: "一時停止"
  resume: "再開"
  reset: "リセット"
  finished: "{{title}} の時間です"
  timeUp: "時間です"
`;
const t = createTranslator(messages);

type TimerState = { total: number; remaining: number; endAt: number | null };

/** 计时状态按卡片内容存在模块里：消息重渲染或卡片重新挂载都不会中断计时。 */
const timers = new Map<string, TimerState>();

function formatClock(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function remainingOf(state: TimerState, now: number) {
  return state.endAt === null ? state.remaining : Math.max(0, state.endAt - now);
}

/** 计时器：圆环随剩余时间收拢，开始 / 暂停 / 重置；到点轻轻脉动并发系统通知。 */
export function TimerCard({ card }: { card: TimerCardData }) {
  useLocale();
  const reduce = useReducedMotion();
  const pulse = useAnimationControls();
  const key = `${card.title}|${card.minutes}`;
  const total = Math.max(1, Math.round(card.minutes * 60_000));
  const [state, setState] = useState<TimerState>(() => timers.get(key) ?? { total, remaining: total, endAt: null });
  const [now, setNow] = useState(() => Date.now());
  const notified = useRef(false);
  const remaining = remainingOf(state, now);
  const running = state.endAt !== null && remaining > 0;
  const done = remaining <= 0;

  useEffect(() => { timers.set(key, state); }, [key, state]);

  useEffect(() => {
    if (state.endAt === null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [state.endAt]);

  useEffect(() => {
    if (!done || state.endAt === null) { notified.current = false; return; }
    if (notified.current) return;
    notified.current = true;
    setState(prev => ({ ...prev, remaining: 0, endAt: null }));
    shell.showNotification(t("finished", { title: card.title }));
    if (!reduce) void pulse.start({ scale: [1, 1.06, 1, 1.04, 1], transition: { duration: 1.2, ease: "easeInOut" } });
  }, [done, state.endAt, card.title, pulse, reduce]);

  const start = () => {
    const at = Date.now();
    setNow(at);
    setState(prev => ({ ...prev, endAt: at + (prev.remaining > 0 ? prev.remaining : prev.total) }));
  };
  const pause = () => setState(prev => ({ ...prev, remaining: remainingOf(prev, Date.now()), endAt: null }));
  const reset = () => { notified.current = false; setState({ total, remaining: total, endAt: null }); };

  return <div className="ai-card-timer" data-done={done || undefined}>
    <motion.div className="ai-card-timer-ring" variants={rowVariants}>
      <motion.span animate={pulse} style={{ display: "inline-flex" }}>
        <CardRing value={remaining / state.total} size={112} stroke={5}>
          <span className="ai-card-timer-clock goose-tabular" role="timer" aria-live={done ? "polite" : "off"}>
            {done ? t("timeUp") : formatClock(remaining)}
          </span>
        </CardRing>
      </motion.span>
    </motion.div>
    <motion.div className="ai-card-actions ai-card-actions-center" variants={rowVariants}>
      {running
        ? <Button type="button" variant="outline" size="sm" className="ai-card-btn" onClick={pause}><Pause aria-hidden="true"/>{t("pause")}</Button>
        : <Button type="button" variant="outline" size="sm" className="ai-card-btn" disabled={done} onClick={start}>
          <Play aria-hidden="true"/>{state.remaining < state.total ? t("resume") : t("start")}
        </Button>}
      <Button type="button" variant="ghost" size="sm" className="ai-card-btn" disabled={!done && !running && state.remaining === state.total} onClick={reset}>
        <RotateCcw aria-hidden="true"/>{t("reset")}
      </Button>
    </motion.div>
  </div>;
}
