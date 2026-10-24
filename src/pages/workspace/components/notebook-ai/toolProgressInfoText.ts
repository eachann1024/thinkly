import { createTranslator, i18nYaml } from "@/i18n";
import { formatNotebookAiError } from "@/lib/notebook-ai/errors";
import type { ProgressStep, ToolProgressPart } from "./toolProgressModel";
import { asString, readObject, truncate } from "./toolProgressValues";

const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/toolProgressInfoText.ts#messages:1">`
zh-Hans:
  weather: "查询天气"
  exchange: "查询汇率"
  worldTime: "查看时间"
  querying: "正在查询"
  weatherDone: "{{place}} {{temp}}°，{{days}} 天预报"
  exchangeDone: "1 {{base}} = {{rate}} {{quote}}"
  worldTimeDone: "已显示 {{count}} 个地点的时间"
  crypto: "查询加密货币"
  showChoices: "给出选项"
  showChecklist: "生成清单"
  showSteps: "生成步骤"
  showQuiz: "生成测验"
  showFlashcards: "生成记忆卡"
  showCalculator: "生成计算器"
  showUnitConverter: "单位换算"
  showTimer: "设置计时器"
  showCountdown: "设置倒计时"
  showTimeline: "生成时间线"
  showComparison: "生成对比"
  showStats: "整理数据"
  showRecipe: "整理食谱"
  showDefinition: "查释义"
  showWidget: "生成小组件"
  generating: "正在生成"
  cardShown: "已显示卡片"
en:
  weather: "Weather"
  exchange: "Exchange rate"
  worldTime: "World time"
  querying: "Looking up"
  weatherDone: "{{place}} {{temp}}°, {{days}}-day forecast"
  exchangeDone: "1 {{base}} = {{rate}} {{quote}}"
  worldTimeDone: "Showing time for {{count}} places"
  crypto: "Crypto prices"
  showChoices: "Offer choices"
  showChecklist: "Checklist"
  showSteps: "Steps"
  showQuiz: "Quiz"
  showFlashcards: "Flashcards"
  showCalculator: "Calculator"
  showUnitConverter: "Unit converter"
  showTimer: "Timer"
  showCountdown: "Countdown"
  showTimeline: "Timeline"
  showComparison: "Comparison"
  showStats: "Stats"
  showRecipe: "Recipe"
  showDefinition: "Definition"
  showWidget: "Widget"
  generating: "Generating"
  cardShown: "Card shown"
ja:
  weather: "天気を調べる"
  exchange: "為替レートを調べる"
  worldTime: "時刻を確認"
  querying: "照会中"
  weatherDone: "{{place}} {{temp}}°、{{days}} 日間の予報"
  exchangeDone: "1 {{base}} = {{rate}} {{quote}}"
  worldTimeDone: "{{count}} か所の時刻を表示しました"
  crypto: "暗号資産を調べる"
  showChoices: "選択肢を提示"
  showChecklist: "チェックリストを作成"
  showSteps: "手順を作成"
  showQuiz: "クイズを作成"
  showFlashcards: "暗記カードを作成"
  showCalculator: "電卓を作成"
  showUnitConverter: "単位換算"
  showTimer: "タイマーを設定"
  showCountdown: "カウントダウンを設定"
  showTimeline: "タイムラインを作成"
  showComparison: "比較を作成"
  showStats: "データを整理"
  showRecipe: "レシピを整理"
  showDefinition: "意味を調べる"
  showWidget: "ウィジェットを作成"
  generating: "生成中"
  cardShown: "カードを表示しました"
`;
const t = createTranslator(messages);

type StepText = Pick<ProgressStep, "label" | "detail">;

export function withSubject(action: string, subject: string) {
  return subject ? `${action} · ${truncate(subject)}` : action;
}

function placesOf(input: Record<string, unknown> | null) {
  const places = Array.isArray(input?.places) ? input.places : [];
  return places.map(place => typeof place === "string" ? place : asString(readObject(place)?.label)).filter(Boolean).join("、");
}

const CARD_LABEL_KEYS = {
  "tool-getCryptoPrice": "crypto", "tool-showChoices": "showChoices", "tool-showChecklist": "showChecklist",
  "tool-showSteps": "showSteps", "tool-showQuiz": "showQuiz", "tool-showFlashcards": "showFlashcards",
  "tool-showCalculator": "showCalculator", "tool-showUnitConverter": "showUnitConverter", "tool-showTimer": "showTimer",
  "tool-showCountdown": "showCountdown", "tool-showTimeline": "showTimeline", "tool-showComparison": "showComparison",
  "tool-showStats": "showStats", "tool-showRecipe": "showRecipe", "tool-showDefinition": "showDefinition", "tool-showWidget": "showWidget",
} as const;

function cardStepText(part: ToolProgressPart, input: Record<string, unknown> | null, error: string): StepText | null {
  const key = CARD_LABEL_KEYS[part.type as keyof typeof CARD_LABEL_KEYS];
  if (!key) return null;
  const subject = asString(input?.title) || asString(input?.question) || asString(input?.term);
  return {
    get label() { return withSubject(t(key), subject); },
    get detail() {
      if (error) return formatNotebookAiError(error);
      return part.output === undefined ? (key === "crypto" ? t("querying") : t("generating")) : t("cardShown");
    },
  };
}

export function getInfoToolStepText(part: ToolProgressPart): StepText | null {
  const input = readObject(part.input);
  const output = readObject(part.output);
  const error = asString(output?.error) || asString(part.errorText);

  if (part.type === "tool-getWeather") {
    const location = asString(input?.location);
    const current = readObject(output?.current);
    const place = asString(readObject(output?.location)?.name) || location;
    return {
      get label() { return withSubject(t("weather"), location); },
      get detail() {
        if (error) return formatNotebookAiError(error);
        if (!current) return t("querying");
        return t("weatherDone", { place, temp: Math.round(Number(current.temperature)), days: Array.isArray(output?.daily) ? output.daily.length : 0 });
      },
    };
  }

  if (part.type === "tool-getExchangeRate") {
    const pair = [asString(input?.from), asString(input?.to)].filter(Boolean).join(" → ");
    return {
      get label() { return withSubject(t("exchange"), pair); },
      get detail() {
        if (error) return formatNotebookAiError(error);
        if (typeof output?.rate !== "number") return t("querying");
        return t("exchangeDone", { base: asString(output.base), quote: asString(output.quote), rate: Number(output.rate.toPrecision(6)) });
      },
    };
  }

  if (part.type === "tool-getWorldTime") {
    const places = placesOf(input);
    return {
      get label() { return withSubject(t("worldTime"), places); },
      get detail() {
        if (error) return formatNotebookAiError(error);
        const entries = Array.isArray(output?.entries) ? output.entries.length : 0;
        return entries ? t("worldTimeDone", { count: entries }) : t("querying");
      },
    };
  }

  return cardStepText(part, input, error);
}
