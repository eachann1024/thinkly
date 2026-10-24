import { useLocale, getFormatLocale, getLocale, createTranslator, i18nYaml } from "@/i18n";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ArrowLeftRight } from "@/components/ui/icons";
import type { UnitConverterCardData } from "@/lib/notebook-ai/cards/types";
import { ROW_SPRING, rowVariants, useTween } from "./cardMotion";
import { convertUnit, resolveUnit, UNIT_TABLES, type UnitDef } from "./unitTables";

const messages = i18nYaml<"src/pages/workspace/components/ai-cards/UnitConverterCard.tsx#messages:1">`
zh-Hans:
  value: "数值"
  from: "原单位"
  to: "目标单位"
  swap: "互换单位"
en:
  value: "Value"
  from: "From unit"
  to: "To unit"
  swap: "Swap units"
ja:
  value: "数値"
  from: "変換元の単位"
  to: "変換先の単位"
  swap: "単位を入れ替え"
`;
const t = createTranslator(messages);

function unitName(unit: UnitDef) {
  const name = getLocale() === "zh-Hans" ? unit.zh : unit.en;
  return name === unit.symbol ? name : `${name} (${unit.symbol})`;
}

function format(value: number) {
  const abs = Math.abs(value);
  if (abs !== 0 && (abs < 1e-4 || abs >= 1e12)) return value.toExponential(4);
  const digits = abs >= 1000 ? 2 : abs >= 1 ? 4 : 6;
  return new Intl.NumberFormat(getFormatLocale(), { maximumFractionDigits: digits }).format(value);
}

function UnitSelect({ units, value, label, onChange }: { units: UnitDef[]; value: string; label: string; onChange: (id: string) => void }) {
  return <Select controlSize="small" aria-label={label} value={value} onChange={event => onChange(event.currentTarget.value)}>
    {units.map(unit => <option key={unit.id} value={unit.id}>{unitName(unit)}</option>)}
  </Select>;
}

export function UnitConverterCard({ card }: { card: UnitConverterCardData }) {
  useLocale();
  const reduce = useReducedMotion();
  const category = UNIT_TABLES[card.category] ? card.category : "length";
  const units = UNIT_TABLES[category];
  const [draft, setDraft] = useState(String(card.value));
  const [from, setFrom] = useState(() => resolveUnit(category, card.from).id);
  const [to, setTo] = useState(() => resolveUnit(category, card.to).id);
  const [turns, setTurns] = useState(0);
  const value = Number(draft);
  const fromUnit = units.find(u => u.id === from) ?? units[0];
  const toUnit = units.find(u => u.id === to) ?? units[0];
  const result = draft.trim() !== "" && Number.isFinite(value) ? convertUnit(category, value, fromUnit, toUnit) : null;
  const shown = useTween(result);
  const swap = () => { setFrom(to); setTo(from); setTurns(n => n + 1); if (result !== null) setDraft(String(Number(result.toPrecision(10)))); };
  return <div className="ai-card-unit">
    <motion.div className="ai-card-unit-result" variants={rowVariants}>
      <span className="ai-card-unit-value goose-tabular">{shown === null ? "—" : format(shown)}</span>
      <span className="ai-card-unit-symbol">{toUnit.symbol}</span>
    </motion.div>
    <motion.div className="ai-card-unit-form" variants={rowVariants}>
      <Input type="number" controlSize="small" className="goose-tabular" aria-label={t("value")} value={draft}
        onChange={event => setDraft(event.currentTarget.value)}/>
      <UnitSelect units={units} value={from} label={t("from")} onChange={setFrom}/>
      <IconButton type="button" size="sm" tone="muted" aria-label={t("swap")} title={t("swap")} onClick={swap}>
        <motion.span style={{ display: "inline-flex" }} animate={{ rotate: turns * 180 }} transition={reduce ? { duration: 0 } : ROW_SPRING}>
          <ArrowLeftRight size={14} aria-hidden="true"/>
        </motion.span>
      </IconButton>
      <UnitSelect units={units} value={to} label={t("to")} onChange={setTo}/>
    </motion.div>
  </div>;
}
