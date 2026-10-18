import { useLocale, createTranslator, i18nYaml } from "@/i18n";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { ChevronLeft, ChevronRight, RefreshCw } from "@/components/ui/icons";
import type { FlashcardsCardData } from "@/lib/notebook-ai/cards/types";
import { rowVariants } from "./cardMotion";

const messages = i18nYaml<"src/pages/workspace/components/ai-cards/FlashcardsCard.tsx#messages:1">`
zh-Hans:
  flip: "翻面"
  previous: "上一张"
  next: "下一张"
  shuffle: "打乱顺序"
en:
  flip: "Flip card"
  previous: "Previous card"
  next: "Next card"
  shuffle: "Shuffle"
ja:
  flip: "カードを裏返す"
  previous: "前のカード"
  next: "次のカード"
  shuffle: "シャッフル"
`;
const t = createTranslator(messages);

/** 翻转弹簧：略欠阻尼，翻到位时有一点点落定感。 */
const FLIP_SPRING = { type: "spring", stiffness: 260, damping: 26, mass: 0.9 } as const;

function shuffled(length: number, current: number) {
  const order = Array.from({ length }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  // 打乱后不停在刚看的那张
  if (length > 1 && order[0] === current) [order[0], order[1]] = [order[1], order[0]];
  return order;
}

/** 记忆卡：点按翻面（rotateY 弹簧），前后切换与打乱顺序。 */
export function FlashcardsCard({ card }: { card: FlashcardsCardData }) {
  useLocale();
  const reduce = useReducedMotion();
  const total = card.cards.length;
  const [order, setOrder] = useState(() => card.cards.map((_, i) => i));
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const current = card.cards[order[position]] ?? card.cards[0];
  const move = (next: number) => { setFlipped(false); setPosition((next + total) % total); };
  return <div className="ai-card-flash">
    <motion.div variants={rowVariants} className="ai-card-flash-stage">
      <Button contentStyle="preserve" variant="ghost" size={null} type="button" className="ai-card-flash-card"
        title={t("flip")} aria-label={flipped ? current.back : current.front} aria-pressed={flipped} onClick={() => setFlipped(f => !f)}>
        <motion.span key={position} className="ai-card-flash-inner" initial={false}
          animate={{ rotateY: flipped ? 180 : 0 }} transition={reduce ? { duration: 0 } : FLIP_SPRING}>
          <span className="ai-card-flash-face" aria-hidden={flipped}>{current.front}</span>
          <span className="ai-card-flash-face" data-back="true" aria-hidden={!flipped}>{current.back}</span>
        </motion.span>
      </Button>
    </motion.div>
    <motion.div className="ai-card-actions" variants={rowVariants}>
      <IconButton type="button" size="sm" tone="muted" aria-label={t("shuffle")} title={t("shuffle")} disabled={total < 2}
        onClick={() => { setOrder(shuffled(total, order[position])); setPosition(0); setFlipped(false); }}>
        <RefreshCw size={14} aria-hidden="true"/>
      </IconButton>
      <span className="ai-card-flash-count goose-tabular">{position + 1} / {total}</span>
      <IconButton type="button" size="sm" tone="muted" aria-label={t("previous")} title={t("previous")} disabled={total < 2} onClick={() => move(position - 1)}>
        <ChevronLeft size={16} aria-hidden="true"/>
      </IconButton>
      <IconButton type="button" size="sm" tone="muted" aria-label={t("next")} title={t("next")} disabled={total < 2} onClick={() => move(position + 1)}>
        <ChevronRight size={16} aria-hidden="true"/>
      </IconButton>
    </motion.div>
  </div>;
}
