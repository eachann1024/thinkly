import { useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Check, ChevronRight } from "@/components/ui/icons";
import type { ChoicesCardData } from "@/lib/notebook-ai/cards/types";
import { useCardActions } from "./cardActions";
import { rowVariants } from "./cardMotion";

export function ChoicesCard({ card }: { card: ChoicesCardData }) {
  const { send, busy } = useCardActions();
  const [chosen, setChosen] = useState<number | null>(null);
  return <div className="ai-card-choices">
    {card.question && <motion.p className="ai-card-choices-question" variants={rowVariants}>{card.question}</motion.p>}
    <div className="ai-card-choices-list" role="group" aria-label={card.question}>
      {card.options.map((option, index) => {
        const selected = chosen === index;
        return <motion.div key={`${option.label}-${index}`} variants={rowVariants}>
          <Button contentStyle="preserve" variant="ghost" size={null} type="button" className="ai-card-choice"
            data-selected={selected || undefined} aria-pressed={selected}
            disabled={!send || chosen !== null || (busy && !selected)}
            onClick={() => {
              if (!send || chosen !== null) return;
              setChosen(index);
              send(option.message?.trim() || option.label);
            }}>
            <span className="ai-card-choice-text">
              <span className="ai-card-choice-label">{option.label}</span>
              {option.description && <span className="ai-card-choice-desc">{option.description}</span>}
            </span>
            {selected ? <Check size={14} aria-hidden="true"/> : <ChevronRight size={14} aria-hidden="true"/>}
          </Button>
        </motion.div>;
      })}
    </div>
  </div>;
}
