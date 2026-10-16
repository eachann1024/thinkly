import { runAITextStream } from "@/lib/ai-provider";
import { useSettings } from "@/stores/useSettings";

/** 多调用一次模型：把问句改写成笔记里可能出现的检索词（含同义词），失败时返回空。 */
export async function expandQuery(question: string, signal: AbortSignal): Promise<string[]> {
  const ai = useSettings.getState().ai;
  const modelId = ai.workspaceSelectedModelId?.trim() || ai.selectedModelId;
  try {
    const text = await runAITextStream(ai, [
      { role: "system", content: "把用户的问题改写成用于搜索个人笔记的关键词：8 个以内，包含核心词、同义词和相关说法，不要虚词。只输出关键词，用英文逗号分隔，不要解释。" },
      { role: "user", content: question },
    ], { abortSignal: signal, requestOverrides: { selectedModelId: modelId } });
    return text.split(/[,，、\n]/).map(word => word.trim().toLowerCase()).filter(word => word && word.length <= 20).slice(0, 8);
  } catch {
    return [];
  }
}
