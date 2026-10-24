import { tool } from "ai";
import { z } from "zod";

const echo = <K extends string>(kind: K) => async <T extends object>(input: T) => ({ kind, ...input });

export const showTimeline = tool({
  description: "显示时间线卡片。讲历史、经历、项目进度、事件经过等按时间排列的内容时主动使用。",
  inputSchema: z.object({
    title: z.string(),
    events: z.array(z.object({ time: z.string().min(1), title: z.string().min(1), detail: z.string().optional() })).min(2).max(20),
  }),
  execute: echo("timeline"),
});

export const showComparison = tool({
  description: "显示多个选项并排对比的卡片，可标出推荐项。用户在几款产品、方案、城市、工具之间做选择时主动使用。",
  inputSchema: z.object({
    title: z.string(),
    columns: z.array(z.string().min(1)).min(2).max(4).describe("被比较的对象名"),
    rows: z.array(z.object({ label: z.string(), values: z.array(z.string()) })).min(1).max(12),
    recommended: z.number().int().min(0).optional().describe("推荐列的下标"),
    verdict: z.string().optional().describe("一句话结论"),
  }),
  execute: echo("comparison"),
});

export const showStats = tool({
  description: "显示数据指标卡片（大数字加涨跌）。回答里有几个关键数字、统计结果或进度百分比时主动使用。",
  inputSchema: z.object({
    title: z.string().optional(),
    stats: z
      .array(z.object({
        label: z.string(),
        value: z.string().describe("展示值，如 1.2万、87%"),
        delta: z.string().optional().describe("变化，如 +12%"),
        trend: z.enum(["up", "down", "flat"]).optional(),
      }))
      .min(1)
      .max(8),
  }),
  execute: echo("stats"),
});

export const showRecipe = tool({
  description: "显示菜谱卡片，用户可加减份数自动换算用量，步骤可勾选。用户问怎么做菜、饮品、烘焙时使用。",
  inputSchema: z.object({
    title: z.string(),
    servings: z.number().int().positive(),
    time: z.string().optional().describe("总用时，如 30 分钟"),
    ingredients: z.array(z.object({ name: z.string(), amount: z.number().optional(), unit: z.string().optional() })).min(1).max(30),
    steps: z.array(z.string().min(1)).min(1).max(20),
  }),
  execute: echo("recipe"),
});

export const showDefinition = tool({
  description: "显示词条卡片（读音、词性、释义、例句）。用户问某个词、成语、术语、缩写是什么意思时使用。",
  inputSchema: z.object({
    term: z.string(),
    phonetic: z.string().optional(),
    partOfSpeech: z.string().optional(),
    definitions: z.array(z.string().min(1)).min(1).max(6),
    examples: z.array(z.string()).optional(),
  }),
  execute: echo("definition"),
});

export const showWidget = tool({
  description:
    "显示一个自定义的交互小组件（HTML + CSS + 原生 JS，在隔离沙箱运行，不能联网）。现成卡片都不合适、但用户的问题适合“动手玩”时使用：模拟器、可视化演示、小游戏、调色板、抽签转盘等。html 是 body 内的完整片段，可含 <style> 和 <script>，用 CSS 变量 --fg --bg --muted --accent --border 适配深浅色。",
  inputSchema: z.object({
    title: z.string(),
    html: z.string().min(1),
    height: z.number().int().min(120).max(720).optional().describe("初始高度 px，组件可自行调整"),
  }),
  execute: echo("widget"),
});
