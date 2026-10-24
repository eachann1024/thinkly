import { useLocale, createTranslator, i18nYaml } from "@/i18n";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Check, ChevronRight, RotateCcw, X } from "@/components/ui/icons";
import type { QuizCardData } from "@/lib/notebook-ai/cards/types";
import { AutoHeight } from "./AutoHeight";
import { ROW_SPRING, rowVariants, useCountUp } from "./cardMotion";
import { CardProgress } from "./CardProgress";

const messages = i18nYaml<"src/pages/workspace/components/ai-cards/QuizCard.tsx#messages:1">`
zh-Hans:
  next: "下一题"
  result: "查看结果"
  retry: "再做一次"
  score: "答对 {{correct}} / {{total}} 题"
  correct: "回答正确"
  wrong: "回答错误"
en:
  next: "Next"
  result: "See score"
  retry: "Try again"
  score: "{{correct}} of {{total}} correct"
  correct: "Correct"
  wrong: "Incorrect"
ja:
  next: "次の問題"
  result: "結果を見る"
  retry: "もう一度"
  score: "{{total}} 問中 {{correct}} 問正解"
  correct: "正解"
  wrong: "不正解"
`;
const t = createTranslator(messages);

function Score({ correct, total, onRetry }: { correct: number; total: number; onRetry: () => void }) {
  const shown = useCountUp(correct, { from: 0 });
  return <div className="ai-card-quiz-score">
    <span className="ai-card-quiz-score-value goose-tabular">{Math.round(shown)}<span className="ai-card-muted">/{total}</span></span>
    <CardProgress value={total ? correct / total : 0} tone={correct === total ? "success" : "accent"}/>
    <span className="ai-card-muted">{t("score", { correct, total })}</span>
    <div className="ai-card-actions">
      <Button type="button" variant="ghost" size="sm" className="ai-card-btn" onClick={onRetry}><RotateCcw aria-hidden="true"/>{t("retry")}</Button>
    </div>
  </div>;
}

export function QuizCard({ card }: { card: QuizCardData }) {
  useLocale();
  const reduce = useReducedMotion();
  const total = card.questions.length;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>(() => card.questions.map(() => null));
  const [showScore, setShowScore] = useState(false);
  const question = card.questions[index];
  const picked = answers[index];
  const correctCount = answers.filter((a, i) => a !== null && a === card.questions[i].answer).length;
  const pick = (option: number) => {
    if (picked !== null) return;
    setAnswers(prev => prev.map((a, i) => i === index ? option : a));
  };
  const retry = () => { setAnswers(card.questions.map(() => null)); setIndex(0); setShowScore(false); };
  const offset = reduce ? 0 : 20;
  return <div className="ai-card-quiz">
    <AutoHeight>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div key={showScore ? "score" : index} initial={{ opacity: 0, x: offset }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -offset }} transition={ROW_SPRING}>
          {showScore ? <Score correct={correctCount} total={total} onRetry={retry}/> : <>
            <p className="ai-card-quiz-question">
              {total > 1 && <span className="ai-card-steps-index goose-tabular">{index + 1}/{total}</span>}{question.question}
            </p>
            <div className="ai-card-quiz-options" role="group" aria-label={question.question}>
              {question.options.map((option, i) => {
                const state = picked === null ? undefined : i === question.answer ? "right" : i === picked ? "wrong" : "idle";
                return <Button key={`${option}-${i}`} contentStyle="preserve" variant="ghost" size={null} type="button" className="ai-card-choice"
                  data-state={state} disabled={picked !== null && state === "idle"} aria-pressed={picked === i} onClick={() => pick(i)}>
                  <span className="ai-card-quiz-letter goose-tabular" aria-hidden="true">{String.fromCharCode(65 + i)}</span>
                  <span className="ai-card-choice-text"><span className="ai-card-choice-label">{option}</span></span>
                  {state === "right" && <Check size={14} aria-label={t("correct")}/>}
                  {state === "wrong" && <X size={14} aria-label={t("wrong")}/>}
                </Button>;
              })}
            </div>
            <AnimatePresence initial={false}>
              {picked !== null && <motion.div key="feedback" className="ai-card-quiz-feedback" data-state={picked === question.answer ? "right" : "wrong"}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={ROW_SPRING}>
                <span className="ai-card-quiz-verdict">{picked === question.answer ? t("correct") : t("wrong")}</span>
                {question.explanation && <span>{question.explanation}</span>}
              </motion.div>}
            </AnimatePresence>
          </>}
        </motion.div>
      </AnimatePresence>
    </AutoHeight>
    {!showScore && picked !== null && <motion.div className="ai-card-actions" variants={rowVariants} initial="hidden" animate="shown">
      <Button type="button" variant="outline" size="sm" className="ai-card-btn"
        onClick={() => index < total - 1 ? setIndex(index + 1) : setShowScore(true)}>
        {index < total - 1 ? t("next") : t("result")}<ChevronRight aria-hidden="true"/>
      </Button>
    </motion.div>}
  </div>;
}
