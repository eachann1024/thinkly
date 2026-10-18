import { useLocale, createTranslator, i18nYaml } from "@/i18n";
import { memo, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  AppWindow, ArrowLeftRight, Book, BookOpen, CalendarDays, CheckSquare, Clock3, Coffee, Columns2, Globe,
  GraduationCap, History, Kanban, ListOrdered, Sigma, Sun, Zap, type GooseIcon,
} from "@/components/ui/icons";
import type { InfoCardData } from "@/lib/notebook-ai/cards/types";
import { cardVariants } from "./cardMotion";
import { WeatherCard } from "./WeatherCard";
import { ExchangeCard } from "./ExchangeCard";
import { WorldTimeCard } from "./WorldTimeCard";
import { WebResultsCard } from "./WebResultsCard";
import { ChoicesCard } from "./ChoicesCard";
import { ChecklistCard } from "./ChecklistCard";
import { StepsCard } from "./StepsCard";
import { QuizCard } from "./QuizCard";
import { FlashcardsCard } from "./FlashcardsCard";
import { CalculatorCard } from "./CalculatorCard";
import { UnitConverterCard } from "./UnitConverterCard";
import { TimerCard } from "./TimerCard";
import { CountdownCard } from "./CountdownCard";
import { TimelineCard } from "./TimelineCard";
import { ComparisonCard } from "./ComparisonCard";
import { StatsCard } from "./StatsCard";
import { RecipeCard } from "./RecipeCard";
import { DefinitionCard } from "./DefinitionCard";
import { WidgetCard } from "./WidgetCard";
import { CryptoCard } from "./CryptoCard";
import "./ai-cards.css";
import "./interactive-cards.css";

const messages = i18nYaml<"src/pages/workspace/components/ai-cards/InfoCard.tsx#messages:1">`
zh-Hans:
  weather: "天气"
  exchange: "汇率"
  worldTime: "时间"
  webResults: "联网搜索"
  unitConverter: "单位换算"
  crypto: "加密货币"
  stats: "数据"
en:
  weather: "Weather"
  exchange: "Exchange rate"
  worldTime: "Time"
  webResults: "Web search"
  unitConverter: "Unit converter"
  crypto: "Crypto"
  stats: "Stats"
ja:
  weather: "天気"
  exchange: "為替レート"
  worldTime: "時刻"
  webResults: "Web 検索"
  unitConverter: "単位換算"
  crypto: "暗号資産"
  stats: "データ"
`;
const t = createTranslator(messages);

type Kind = InfoCardData["kind"];

const ICONS: Partial<Record<Kind, GooseIcon>> = {
  weather: Sun, exchange: ArrowLeftRight, worldTime: Clock3, webResults: Globe,
  checklist: CheckSquare, steps: ListOrdered, quiz: GraduationCap, flashcards: BookOpen, calculator: Sigma,
  unitConverter: ArrowLeftRight, timer: Clock3, countdown: CalendarDays, timeline: History, comparison: Columns2,
  stats: Kanban, recipe: Coffee, definition: Book, widget: AppWindow, crypto: Zap,
};

type Header = { title: string; source?: string };

/** 表头只在带来信息时出现：选项与释义卡的正文自带主题，不再加装饰标题。 */
function cardHeader(card: InfoCardData): Header | null {
  switch (card.kind) {
    case "weather": case "exchange": return { title: t(card.kind), source: card.source };
    case "worldTime": return { title: t("worldTime") };
    case "webResults": return { title: card.query ? `${t("webResults")} · ${card.query}` : t("webResults"), source: card.source };
    case "crypto": return { title: t("crypto"), source: card.source };
    case "unitConverter": return { title: t("unitConverter") };
    case "stats": return card.title ? { title: card.title } : null;
    case "choices": case "definition": return null;
    default: return card.title ? { title: card.title } : null;
  }
}

function CardBody({ card }: { card: InfoCardData }): ReactNode {
  switch (card.kind) {
    case "weather": return <WeatherCard card={card}/>;
    case "exchange": return <ExchangeCard card={card}/>;
    case "worldTime": return <WorldTimeCard card={card}/>;
    case "webResults": return <WebResultsCard card={card}/>;
    case "choices": return <ChoicesCard card={card}/>;
    case "checklist": return <ChecklistCard card={card}/>;
    case "steps": return <StepsCard card={card}/>;
    case "quiz": return <QuizCard card={card}/>;
    case "flashcards": return <FlashcardsCard card={card}/>;
    case "calculator": return <CalculatorCard card={card}/>;
    case "unitConverter": return <UnitConverterCard card={card}/>;
    case "timer": return <TimerCard card={card}/>;
    case "countdown": return <CountdownCard card={card}/>;
    case "timeline": return <TimelineCard card={card}/>;
    case "comparison": return <ComparisonCard card={card}/>;
    case "stats": return <StatsCard card={card}/>;
    case "recipe": return <RecipeCard card={card}/>;
    case "definition": return <DefinitionCard card={card}/>;
    case "widget": return <WidgetCard card={card}/>;
    case "crypto": return <CryptoCard card={card}/>;
    default: return null;
  }
}

/** 搜索回答与 AI 面板共用的信息卡：弹簧入场，内部行依次落定。 */
export const InfoCard = memo(function InfoCard({ card, className }: { card: InfoCardData; className?: string }) {
  useLocale();
  const reduce = useReducedMotion();
  const header = cardHeader(card);
  const Icon = ICONS[card.kind];
  return <motion.section className={["ai-card", className].filter(Boolean).join(" ")} data-kind={card.kind} aria-label={header?.title}
    variants={cardVariants} initial={reduce ? false : "hidden"} animate="shown">
    {header && <header className="ai-card-head">
      {Icon && <Icon size={14} aria-hidden="true"/>}
      <span className="ai-card-title">{header.title}</span>
      {header.source && <span className="ai-card-source">{header.source}</span>}
    </header>}
    <CardBody card={card}/>
  </motion.section>;
});
