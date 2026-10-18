import { useLocale, createTranslator, i18nYaml } from "@/i18n";
import { useState } from "react";
import { motion } from "motion/react";
import { Checkbox } from "@/components/ui/checkbox";
import { IconButton } from "@/components/ui/icon-button";
import { FilePlus2 } from "@/components/ui/icons";
import type { ChecklistCardData } from "@/lib/notebook-ai/cards/types";
import { useCardActions } from "./cardActions";
import { rowVariants } from "./cardMotion";
import { CardProgress } from "./CardProgress";

const messages = i18nYaml<"src/pages/workspace/components/ai-cards/ChecklistCard.tsx#messages:1">`
zh-Hans:
  insert: "插入当前笔记"
en:
  insert: "Insert into current note"
ja:
  insert: "現在のノートに挿入"
`;
const t = createTranslator(messages);

function toMarkdown(title: string, items: ChecklistCardData["items"], done: boolean[]) {
  const lines = items.map((item, i) => `- [${done[i] ? "x" : " "}] ${item.text.replace(/\n+/g, " ")}`);
  return [title.trim() ? `### ${title.trim()}` : "", ...lines].filter(Boolean).join("\n");
}

/** 可勾选清单：本地勾选、进度条随之伸缩，可整份插入笔记为任务列表。 */
export function ChecklistCard({ card }: { card: ChecklistCardData }) {
  useLocale();
  const { insert } = useCardActions();
  const [done, setDone] = useState(() => card.items.map(item => Boolean(item.done)));
  const count = done.filter(Boolean).length;
  const toggle = (index: number, value: boolean) => setDone(prev => prev.map((v, i) => i === index ? value : v));
  return <div className="ai-card-checklist">
    <motion.div className="ai-card-progress-row" variants={rowVariants}>
      <CardProgress value={card.items.length ? count / card.items.length : 0}/>
      <span className="ai-card-muted goose-tabular">{count}/{card.items.length}</span>
      {insert && <IconButton type="button" size="xs" tone="muted" aria-label={t("insert")} title={t("insert")}
        onClick={() => insert(toMarkdown(card.title, card.items, done))}>
        <FilePlus2 size={14} aria-hidden="true"/>
      </IconButton>}
    </motion.div>
    <ul className="ai-card-checklist-list">
      {card.items.map((item, index) => <motion.li key={`${item.text}-${index}`} variants={rowVariants}>
        <Checkbox className="ai-card-check-row" data-done={done[index] || undefined} isSelected={done[index]} onChange={value => toggle(index, value)}>
          <Checkbox.Control><Checkbox.Indicator/></Checkbox.Control>
          <Checkbox.Content><span className="ai-card-check-text">{item.text}</span></Checkbox.Content>
        </Checkbox>
      </motion.li>)}
    </ul>
  </div>;
}
