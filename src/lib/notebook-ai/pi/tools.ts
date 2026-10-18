import { toolLabel } from "./toolLabels";
import { Type, type Static, type TSchema } from "@earendil-works/pi-ai";
import type { AgentTool, AgentToolResult } from "@earendil-works/pi-agent-core";
import { z } from "zod";
import { ALWAYS_ON_CARD_TOOLS, notebookAiTools } from "../tools";
import { getSkillToolNames, type NotebookSkillId } from "../skills";
import { repairExecuteBatchPlanInput } from "../batch-plan/tool";
import type { NotebookAiAgentContext } from "../types";
import { isNotebookSkillId } from "../skillIds";

type SdkTool = (typeof notebookAiTools)[keyof typeof notebookAiTools];

/** 与 AI SDK 工具描述对齐的 TypeBox 参数（给模型看）。 */
const TOOL_PARAMETERS: Partial<Record<keyof typeof notebookAiTools, TSchema>> = {
  loadSkill: Type.Object({
    skill: Type.Union(
      [
        Type.Literal("createNoote"),
        Type.Literal("updateNote"),
        Type.Literal("deleteNote"),
        Type.Literal("searchNotes"),
        Type.Literal("chat"),
        Type.Literal("visual"),
        Type.Literal("webResearch"),
        Type.Literal("liveInfo"),
      ],
      { description: "要加载的 Skill" },
    ),
  }),
  searchWeb: Type.Object({
    query: Type.String({ description: "搜索关键词" }),
  }),
  readWebPage: Type.Object({
    url: Type.String({ description: "网页 URL" }),
  }),
  getWeather: Type.Object({
    location: Type.String({ description: "城市或地区名" }),
  }),
  getExchangeRate: Type.Object({
    from: Type.String({ description: "源货币 ISO 代码，如 USD" }),
    to: Type.String({ description: "目标货币 ISO 代码，如 CNY" }),
    amount: Type.Optional(Type.Number({ description: "换算金额，默认 1" })),
  }),
  getWorldTime: Type.Object({
    places: Type.Array(
      Type.Object({
        label: Type.String({ description: "显示名称，如 纽约" }),
        timeZone: Type.String({ description: "IANA 时区，如 America/New_York" }),
      }),
      { minItems: 1, maxItems: 6 },
    ),
  }),
  listNotebooks: Type.Object({}),
  listPages: Type.Object({
    notebookId: Type.Optional(
      Type.String({ description: "指定笔记本 id；省略则使用当前绑定笔记本" }),
    ),
  }),
  searchNotes: Type.Object({
    query: Type.Optional(
      Type.String({ description: "搜索关键词", default: "" }),
    ),
  }),
  readPage: Type.Object({
    pageId: Type.Optional(
      Type.String({ description: "页面 id；省略则读取当前打开页面" }),
    ),
  }),
  executeBatchPlan: Type.Object({
    runId: Type.Optional(Type.String({ description: "可选 runId" })),
    title: Type.String({ description: "计划标题" }),
    summary: Type.String({ description: "计划摘要" }),
    operations: Type.Array(
      Type.Object(
        {
          type: Type.Union([
            Type.Literal("create"),
            Type.Literal("edit"),
            Type.Literal("search_replace"),
            Type.Literal("delete"),
          ]),
          operationId: Type.Optional(Type.String()),
          title: Type.Optional(Type.String()),
          markdown: Type.Optional(Type.String()),
          parentId: Type.Optional(Type.String()),
          pageId: Type.Optional(Type.String()),
          pageIds: Type.Optional(Type.Array(Type.String())),
          oldString: Type.Optional(Type.String()),
          newString: Type.Optional(Type.String()),
          replaceAll: Type.Optional(Type.Boolean()),
        },
        { additionalProperties: true },
      ),
      { minItems: 1, maxItems: 50 },
    ),
  }),
  showTable: Type.Object({
    title: Type.Optional(Type.String()),
    columns: Type.Array(Type.String()),
    rows: Type.Array(Type.Array(Type.String())),
  }),
  showChart: Type.Object({
    type: Type.Union([
      Type.Literal("bar"),
      Type.Literal("line"),
      Type.Literal("pie"),
    ]),
    title: Type.Optional(Type.String()),
    data: Type.Any(),
  }),
  showDiagram: Type.Object({
    title: Type.Optional(Type.String()),
    language: Type.Literal("mermaid"),
    source: Type.String(),
  }),
  showSvg: Type.Object({
    title: Type.Optional(Type.String({ description: "图片标题" })),
    svg: Type.String({
      description: "完整 SVG 标记，从 <svg> 开始到 </svg> 结束。不要写进正文或代码块。",
    }),
  }),
};

/** 没有手写 TypeBox 的工具（卡片类）直接由 zod 生成 JSON Schema，pi-ai 同样能校验。 */
function toolParameters(name: keyof typeof notebookAiTools): TSchema {
  const manual = TOOL_PARAMETERS[name];
  if (manual) return manual;
  const schema = notebookAiTools[name].inputSchema as z.ZodType;
  const { $schema: _ignored, ...json } = z.toJSONSchema(schema, { io: "input" }) as Record<string, unknown>;
  return json as unknown as TSchema;
}

function resultToAgentToolResult(value: unknown): AgentToolResult<unknown> {
  const text =
    typeof value === "string" ? value : JSON.stringify(value ?? null, null, 0);
  return {
    content: [{ type: "text", text }],
    details: value,
  };
}

async function runSdkTool(
  tool: SdkTool,
  toolCallId: string,
  params: unknown,
  agentContext: NotebookAiAgentContext,
  signal?: AbortSignal,
): Promise<AgentToolResult<unknown>> {
  const execute = tool.execute;
  if (typeof execute !== "function") {
    throw new Error("工具缺少 execute");
  }

  let input = params;
  if (
    tool === notebookAiTools.executeBatchPlan &&
    (typeof params !== "object" || params === null)
  ) {
    const repaired =
      typeof params === "string" ? repairExecuteBatchPlanInput(params) : null;
    if (repaired) {
      try {
        input = JSON.parse(repaired);
      } catch {
        input = params;
      }
    }
  }

  const output = await execute(
    input as never,
    {
      toolCallId,
      messages: [],
      abortSignal: signal,
      experimental_context: agentContext,
    } as never,
  );

  const result = resultToAgentToolResult(output);
  if (tool === notebookAiTools.executeBatchPlan) {
    // 审批卡已生成：终止后续自动 LLM 轮次（对齐 legacy hasToolCall stopWhen）
    result.terminate = true;
  }
  return result;
}

export function buildPiDomainTools(
  agentContext: NotebookAiAgentContext,
): AgentTool[] {
  const names = Object.keys(notebookAiTools) as Array<
    keyof typeof notebookAiTools
  >;

  return names.map((name) => {
    const sdkTool = notebookAiTools[name];
    const parameters = toolParameters(name);
    return {
      name,
      label: toolLabel(name),
      description: sdkTool.description ?? name,
      parameters,
      execute: async (toolCallId, params, signal) =>
        runSdkTool(
          sdkTool,
          toolCallId,
          params as Static<typeof parameters>,
          agentContext,
          signal,
        ),
    } satisfies AgentTool;
  });
}

/** 按已加载 Skill 裁剪 active tools（始终保留 loadSkill）。 */
export function getActivePiTools(
  allTools: AgentTool[],
  agentContext: NotebookAiAgentContext,
): AgentTool[] {
  const activeNames = new Set<string>([
    "loadSkill",
    ...ALWAYS_ON_CARD_TOOLS,
    ...getSkillToolNames(agentContext.loadedSkills),
  ]);
  return allTools.filter((tool) => activeNames.has(tool.name));
}

export function isKnownSkillId(value: unknown): value is NotebookSkillId {
  return isNotebookSkillId(value);
}
