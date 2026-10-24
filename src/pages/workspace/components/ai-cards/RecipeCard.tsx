import { useLocale, getFormatLocale, createTranslator, i18nYaml } from "@/i18n";
import { useState } from "react";
import { motion } from "motion/react";
import { Checkbox } from "@/components/ui/checkbox";
import { IconButton } from "@/components/ui/icon-button";
import { Clock3, Minus, Plus } from "@/components/ui/icons";
import type { RecipeCardData } from "@/lib/notebook-ai/cards/displayTypes";
import { rowVariants } from "./cardMotion";
import "./ai-cards-info.css";

const messages = i18nYaml<"src/pages/workspace/components/ai-cards/RecipeCard.tsx#messages:1">`
zh-Hans:
  servings: "{{count}} 人份"
  fewer: "减少份数"
  more: "增加份数"
  ingredients: "食材"
  steps: "步骤"
en:
  servings: "Serves {{count}}"
  fewer: "Fewer servings"
  more: "More servings"
  ingredients: "Ingredients"
  steps: "Steps"
ja:
  servings: "{{count}} 人分"
  fewer: "人数を減らす"
  more: "人数を増やす"
  ingredients: "材料"
  steps: "手順"
`;
const t = createTranslator(messages);

const MAX_SERVINGS = 99;
const FRACTIONS: Array<[number, string]> = [[0.25, "¼"], [1 / 3, "⅓"], [0.5, "½"], [2 / 3, "⅔"], [0.75, "¾"]];

function formatAmount(value: number) {
  if (!(value > 0)) return "0";
  if (value >= 200) return String(Math.round(value / 5) * 5);
  if (value >= 20) return String(Math.round(value));
  const whole = Math.floor(value);
  const part = value - whole;
  if (part < 0.04 && whole) return String(whole);
  if (part > 0.96) return String(whole + 1);
  const fraction = FRACTIONS.find(([v]) => Math.abs(part - v) < 0.04);
  if (fraction) return whole ? `${whole}${fraction[1]}` : fraction[1];
  return new Intl.NumberFormat(getFormatLocale(), { maximumFractionDigits: value < 1 ? 2 : 1 }).format(value);
}

function useChecks(size: number) {
  const [checked, setChecked] = useState<boolean[]>(() => Array(size).fill(false));
  const toggle = (index: number) => setChecked(list => list.map((value, i) => (i === index ? !value : value)));
  return [checked, toggle] as const;
}

export function RecipeCard({ card }: { card: RecipeCardData }) {
  useLocale();
  const base = Math.max(1, card.servings);
  const [servings, setServings] = useState(base);
  const [haveIngredient, toggleIngredient] = useChecks(card.ingredients.length);
  const [doneStep, toggleStep] = useChecks(card.steps.length);
  const scale = servings / base;
  return <div className="ai-recipe">
    <motion.div className="ai-recipe-bar" variants={rowVariants}>
      {card.time && <span className="ai-chip"><Clock3 size={12} aria-hidden="true"/>{card.time}</span>}
      <span className="ai-stepper" role="group" aria-label={t("servings", { count: servings })}>
        <IconButton size="xs" tone="muted" type="button" aria-label={t("fewer")} disabled={servings <= 1} onClick={() => setServings(n => Math.max(1, n - 1))}>
          <Minus size={14}/>
        </IconButton>
        <span className="ai-stepper-value goose-tabular" aria-live="polite">{t("servings", { count: servings })}</span>
        <IconButton size="xs" tone="muted" type="button" aria-label={t("more")} disabled={servings >= MAX_SERVINGS} onClick={() => setServings(n => Math.min(MAX_SERVINGS, n + 1))}>
          <Plus size={14}/>
        </IconButton>
      </span>
    </motion.div>
    <ul className="ai-recipe-list" aria-label={t("ingredients")}>
      {card.ingredients.map((item, index) => <motion.li key={`${index}-${item.name}`} variants={rowVariants} data-done={haveIngredient[index] || undefined}>
        <Checkbox isSelected={haveIngredient[index]} onChange={() => toggleIngredient(index)} className="ai-recipe-check">
          <Checkbox.Control><Checkbox.Indicator/></Checkbox.Control>
          <span className="ai-recipe-name">{item.name}</span>
          {item.amount != null && <span className="ai-recipe-amount goose-tabular">{formatAmount(item.amount * scale)}{item.unit ? ` ${item.unit}` : ""}</span>}
          {item.amount == null && item.unit && <span className="ai-recipe-amount">{item.unit}</span>}
        </Checkbox>
      </motion.li>)}
    </ul>
    <ol className="ai-recipe-steps" aria-label={t("steps")}>
      {card.steps.map((step, index) => <motion.li key={index} variants={rowVariants} data-done={doneStep[index] || undefined}>
        <Checkbox isSelected={doneStep[index]} onChange={() => toggleStep(index)} className="ai-recipe-check">
          <Checkbox.Control><Checkbox.Indicator/></Checkbox.Control>
          <span className="ai-recipe-index goose-tabular">{index + 1}</span>
          <span className="ai-recipe-step">{step}</span>
        </Checkbox>
      </motion.li>)}
    </ol>
  </div>;
}
