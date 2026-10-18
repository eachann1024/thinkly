import { useLocale, createTranslator, i18nYaml } from "@/i18n";
import { motion } from "motion/react";
import { Lightbulb } from "@/components/ui/icons";
import type { ComparisonCardData } from "@/lib/notebook-ai/cards/displayTypes";
import { rowVariants } from "./cardMotion";
import "./ai-cards-info.css";

const messages = i18nYaml<"src/pages/workspace/components/ai-cards/ComparisonCard.tsx#messages:1">`
zh-Hans:
  recommended: "推荐"
en:
  recommended: "Pick"
ja:
  recommended: "おすすめ"
`;
const t = createTranslator(messages);

export function ComparisonCard({ card }: { card: ComparisonCardData }) {
  useLocale();
  const pick = card.recommended != null && card.recommended >= 0 && card.recommended < card.columns.length ? card.recommended : -1;
  const lastRow = card.rows.length - 1;
  const cellProps = (col: number, row: number) => col === pick ? { "data-rec": "", "data-last": row === lastRow ? "" : undefined } : {};
  return <div className="ai-cmp">
    <motion.div className="ai-cmp-scroll" variants={rowVariants}>
      <table className="ai-cmp-table" style={{ minWidth: `${6 + card.columns.length * 7}rem` }}>
        <thead>
          <tr>
            <th scope="col" className="ai-cmp-corner"/>
            {card.columns.map((column, col) => <th key={col} scope="col" {...(col === pick ? { "data-rec": "", "data-last": lastRow < 0 ? "" : undefined } : {})}>
              <span className="ai-cmp-colname">{column}</span>
              {col === pick && <span className="ai-cmp-badge">{t("recommended")}</span>}
            </th>)}
          </tr>
        </thead>
        <tbody>
          {card.rows.map((row, r) => <tr key={`${r}-${row.label}`}>
            <th scope="row">{row.label}</th>
            {card.columns.map((_, col) => <td key={col} {...cellProps(col, r)}>{row.values[col] ?? "—"}</td>)}
          </tr>)}
        </tbody>
      </table>
    </motion.div>
    {card.verdict && <motion.p className="ai-cmp-verdict" variants={rowVariants}>
      <Lightbulb size={14} aria-hidden="true"/><span>{card.verdict}</span>
    </motion.p>}
  </div>;
}
