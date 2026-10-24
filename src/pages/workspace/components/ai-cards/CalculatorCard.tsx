import { useLocale, getFormatLocale, createTranslator, i18nYaml } from "@/i18n";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Input } from "@/components/ui/input";
import { Range } from "@/components/ui/range";
import type { CalculatorCardData } from "@/lib/notebook-ai/cards/types";
import { compileFormula, safeEvaluate, type CompiledFormula } from "./calcExpression";
import { rowVariants, useTween } from "./cardMotion";

const messages = i18nYaml<"src/pages/workspace/components/ai-cards/CalculatorCard.tsx#messages:1">`
zh-Hans:
  invalidFormula: "公式无法计算"
en:
  invalidFormula: "Formula can’t be evaluated"
ja:
  invalidFormula: "式を計算できません"
`;
const t = createTranslator(messages);

type Variable = CalculatorCardData["variables"][number];

function format(value: number, decimals?: number) {
  const digits = decimals ?? (Math.abs(value) >= 100 ? 0 : 2);
  return new Intl.NumberFormat(getFormatLocale(), { minimumFractionDigits: decimals ?? 0, maximumFractionDigits: digits }).format(value);
}

function clamp(value: number, v: Variable) {
  return Math.max(Math.min(v.min, v.max), Math.min(Math.max(v.min, v.max), value));
}

function VariableRow({ variable, value, onChange }: { variable: Variable; value: number; onChange: (value: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const step = variable.step ?? (Math.abs(variable.max - variable.min) <= 10 ? 0.1 : 1);
  return <motion.div className="ai-card-calc-var" variants={rowVariants}>
    <span className="ai-card-calc-var-head">
      <span className="ai-card-calc-var-label">{variable.label}</span>
      <span className="ai-card-calc-var-input">
        <Input type="number" controlSize="small" className="goose-tabular" value={draft ?? String(value)} step={step}
          aria-label={variable.label}
          onChange={event => {
            setDraft(event.currentTarget.value);
            const next = event.currentTarget.valueAsNumber;
            if (Number.isFinite(next)) onChange(next);
          }}
          onBlur={() => setDraft(null)}/>
        {variable.unit && <span className="ai-card-muted">{variable.unit}</span>}
      </span>
    </span>
    <Range min={variable.min} max={variable.max} step={step} value={clamp(value, variable)} aria-label={variable.label}
      onChange={event => { setDraft(null); onChange(event.currentTarget.valueAsNumber); }}/>
  </motion.div>;
}

function OutputRow({ output, compiled, vars }: { output: CalculatorCardData["outputs"][number]; compiled: CompiledFormula | null; vars: Record<string, number> }) {
  const value = safeEvaluate(compiled, vars);
  const shown = useTween(value);
  return <motion.div className="ai-card-calc-out" variants={rowVariants} data-error={value === null || undefined}>
    <span className="ai-card-calc-out-label">{output.label}</span>
    {shown === null
      ? <span className="ai-card-calc-error" role="alert">{t("invalidFormula")}</span>
      : <span className="ai-card-calc-out-value goose-tabular">{format(shown, output.decimals)}
        {output.unit && <span className="ai-card-calc-out-unit">{output.unit}</span>}</span>}
  </motion.div>;
}

export function CalculatorCard({ card }: { card: CalculatorCardData }) {
  useLocale();
  const [vars, setVars] = useState<Record<string, number>>(() => Object.fromEntries(card.variables.map(v => [v.name, v.value])));
  const compiled = useMemo(() => card.outputs.map(output => {
    try { return compileFormula(output.formula); } catch { return null; }
  }), [card.outputs]);
  return <div className="ai-card-calc">
    <div className="ai-card-calc-outputs">
      {card.outputs.map((output, i) => <OutputRow key={`${output.label}-${i}`} output={output} compiled={compiled[i]} vars={vars}/>)}
    </div>
    <div className="ai-card-calc-vars">
      {card.variables.map(variable => <VariableRow key={variable.name} variable={variable} value={vars[variable.name] ?? variable.value}
        onChange={value => setVars(prev => ({ ...prev, [variable.name]: value }))}/>)}
    </div>
  </div>;
}
