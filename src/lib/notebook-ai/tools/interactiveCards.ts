import { tool } from "ai";
import { z } from "zod";

/**
 * 交互式卡片：execute 原样带上 kind 返回，UI 按 kind 渲染可点、可勾、可拖的卡片。
 * 描述里写清「什么时候主动用」，模型不需要用户说出“交互式”也会选用。
 */
const echo = <K extends string>(kind: K) => async <T extends object>(input: T) => ({ kind, ...input });

export const showChoices = tool({
  description:
    "给用户几个可点击的选项按钮，点一下就会作为用户的下一句话发出。回答末尾需要用户做选择、确认方向、挑下一步，或问题有歧义需要澄清时主动使用，代替在正文里列“你想要 A 还是 B”。",
  inputSchema: z.object({
    question: z.string().optional().describe("选项上方的一句提问，可省略"),
    options: z
      .array(z.object({
        label: z.string().min(1).describe("按钮文字，简短"),
        message: z.string().optional().describe("点击后实际发送的话，省略则发送 label"),
        description: z.string().optional().describe("一行补充说明"),
      }))
      .min(2)
      .max(6),
  }),
  execute: echo("choices"),
});

export const showChecklist = tool({
  description: "显示可勾选的清单卡片（待办、行前清单、购物单、检查项）。回答里出现 3 条以上可执行事项时主动使用。",
  inputSchema: z.object({
    title: z.string().describe("清单标题"),
    items: z.array(z.object({ text: z.string().min(1), done: z.boolean().optional() })).min(1).max(30),
  }),
  execute: echo("checklist"),
});

export const showSteps = tool({
  description: "显示可逐步翻看、逐步打勾的操作步骤卡片。教程、安装、办事流程等有先后顺序的指导时主动使用。",
  inputSchema: z.object({
    title: z.string(),
    steps: z.array(z.object({ title: z.string().min(1), detail: z.string().optional() })).min(2).max(15),
  }),
  execute: echo("steps"),
});

export const showQuiz = tool({
  description: "显示可作答的小测验卡片，点选后立即判对错并给解析。用户在学习、复习、想检验理解，或说“考考我”时主动使用。",
  inputSchema: z.object({
    title: z.string(),
    questions: z
      .array(z.object({
        question: z.string().min(1),
        options: z.array(z.string().min(1)).min(2).max(6),
        answer: z.number().int().min(0).describe("正确选项的下标，从 0 开始"),
        explanation: z.string().optional(),
      }))
      .min(1)
      .max(10),
  }),
  execute: echo("quiz"),
});

export const showFlashcards = tool({
  description: "显示可翻面的记忆卡片（正面问题/单词，背面答案/释义）。背单词、记概念、整理知识点时主动使用。",
  inputSchema: z.object({
    title: z.string(),
    cards: z.array(z.object({ front: z.string().min(1), back: z.string().min(1) })).min(1).max(30),
  }),
  execute: echo("flashcards"),
});

export const showCalculator = tool({
  description:
    "显示带滑块的实时计算器卡片：用户拖动参数，结果按公式即时重算。房贷、复利、BMI、预算、折扣、换算比例等“改参数看结果”的问题时主动使用。公式只用变量名、数字、+ - * / ^ ( ) 和 min max round floor ceil sqrt abs log exp pow。",
  inputSchema: z.object({
    title: z.string(),
    variables: z
      .array(z.object({
        name: z.string().regex(/^[A-Za-z_]\w*$/).describe("公式里用的变量名，英文"),
        label: z.string(),
        value: z.number(),
        min: z.number(),
        max: z.number(),
        step: z.number().positive().optional(),
        unit: z.string().optional(),
      }))
      .min(1)
      .max(6),
    outputs: z
      .array(z.object({
        label: z.string(),
        formula: z.string().min(1),
        unit: z.string().optional(),
        decimals: z.number().int().min(0).max(6).optional(),
      }))
      .min(1)
      .max(4),
  }),
  execute: echo("calculator"),
});

export const showUnitConverter = tool({
  description: "显示可输入的单位换算卡片，用户改数值或单位实时换算。用户问长度、重量、温度、面积、体积、速度、数据大小、时间单位换算时使用。",
  inputSchema: z.object({
    category: z.enum(["length", "weight", "temperature", "area", "volume", "speed", "data", "time"]),
    value: z.number(),
    from: z.string().describe("单位代号，如 km、mi、kg、lb、c、f、m2、mu、l、gal、kmh、mph、mb、gb、h、min"),
    to: z.string(),
  }),
  execute: echo("unitConverter"),
});

export const showTimer = tool({
  description: "显示可开始、暂停、重置的计时器卡片（番茄钟、泡茶、煮蛋、运动间歇）。用户要计时或提到番茄工作法时使用。",
  inputSchema: z.object({
    title: z.string(),
    minutes: z.number().positive().max(600),
  }),
  execute: echo("timer"),
});

export const showCountdown = tool({
  description: "显示实时倒计时卡片。用户问距离某个日子还有多久（节日、考试、生日、截止日）时使用。",
  inputSchema: z.object({
    title: z.string(),
    target: z.string().describe("目标时间，ISO 8601，如 2027-01-01T00:00:00+08:00"),
  }),
  execute: echo("countdown"),
});
