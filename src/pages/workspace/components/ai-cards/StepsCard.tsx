import { useLocale, createTranslator, i18nYaml } from "@/i18n";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RotateCcw } from "@/components/ui/icons";
import type { StepsCardData } from "@/lib/notebook-ai/cards/types";
import { AutoHeight } from "./AutoHeight";
import { ROW_SPRING, rowVariants } from "./cardMotion";
import { StepCheck } from "./StepMarks";

const messages = i18nYaml<"src/pages/workspace/components/ai-cards/StepsCard.tsx#messages:1">`
zh-Hans:
  previous: "上一步"
  next: "下一步"
  finish: "完成"
  restart: "重新开始"
  allDone: "全部完成"
  goToStep: "第 {{index}} 步"
en:
  previous: "Back"
  next: "Next"
  finish: "Done"
  restart: "Start over"
  allDone: "All done"
  goToStep: "Step {{index}}"
ja:
  previous: "前へ"
  next: "次へ"
  finish: "完了"
  restart: "最初からやり直す"
  allDone: "すべて完了"
  goToStep: "ステップ {{index}}"
`;
const t = createTranslator(messages);

/** 逐步翻看：上一步 / 下一步横向滑入，外壳高度随内容平滑伸缩；走过的步骤在圆点里打勾。 */
export function StepsCard({ card }: { card: StepsCardData }) {
  useLocale();
  const reduce = useReducedMotion();
  const total = card.steps.length;
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [done, setDone] = useState<boolean[]>(() => card.steps.map(() => false));
  const [finished, setFinished] = useState(false);
  const go = (next: number) => {
    setFinished(false);
    setDirection(next >= index ? 1 : -1);
    setIndex(Math.max(0, Math.min(total - 1, next)));
  };
  const advance = () => {
    setDone(prev => prev.map((v, i) => i === index ? true : v));
    if (index < total - 1) go(index + 1);
    else setFinished(true);
  };
  const restart = () => { setDone(card.steps.map(() => false)); go(0); };
  const step = card.steps[index];
  const offset = reduce ? 0 : 24;
  return <div className="ai-card-steps">
    <motion.ol className="ai-card-steps-dots" variants={rowVariants}>
      {card.steps.map((s, i) => <li key={`${s.title}-${i}`}>
        <Button contentStyle="preserve" variant="ghost" size={null} type="button" className="ai-card-steps-dot" data-active={i === index || undefined} data-done={done[i] || undefined}
          aria-label={t("goToStep", { index: i + 1 })} aria-current={i === index ? "step" : undefined} onClick={() => go(i)}>
          {done[i] ? <StepCheck/> : <span className="goose-tabular">{i + 1}</span>}
        </Button>
      </li>)}
    </motion.ol>
    <AutoHeight className="ai-card-steps-stage">
      <AnimatePresence mode="popLayout" initial={false} custom={direction}>
        <motion.div key={finished ? "done" : index} className="ai-card-steps-body" custom={direction}
          initial={{ opacity: 0, x: direction * offset }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -direction * offset }}
          transition={ROW_SPRING}>
          {finished
            ? <p className="ai-card-steps-title">{t("allDone")}</p>
            : <>
              <p className="ai-card-steps-title"><span className="ai-card-steps-index goose-tabular">{index + 1}/{total}</span>{step.title}</p>
              {step.detail && <p className="ai-card-steps-detail">{step.detail}</p>}
            </>}
        </motion.div>
      </AnimatePresence>
    </AutoHeight>
    <motion.div className="ai-card-actions" variants={rowVariants}>
      {finished
        ? <Button type="button" variant="ghost" size="sm" className="ai-card-btn" onClick={restart}><RotateCcw aria-hidden="true"/>{t("restart")}</Button>
        : <>
          <Button type="button" variant="ghost" size="sm" className="ai-card-btn" disabled={index === 0} onClick={() => go(index - 1)}>
            <ChevronLeft aria-hidden="true"/>{t("previous")}
          </Button>
          <Button type="button" variant="outline" size="sm" className="ai-card-btn" onClick={advance}>
            {index === total - 1 ? t("finish") : t("next")}{index < total - 1 && <ChevronRight aria-hidden="true"/>}
          </Button>
        </>}
    </motion.div>
  </div>;
}
