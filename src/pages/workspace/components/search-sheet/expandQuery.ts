import { generateText } from "ai";
import { buildLanguageModel } from "@/lib/notebook-ai/model";

const TIMEOUT_MS = 6000;
const MAX_TERMS = 8;

const SYSTEM = [
  "你是笔记检索的查询改写器。把用户问题改写成 3–8 个用于全文检索的关键词或短语。",
  "包含问题里的核心名词、常见同义说法，以及对应的中英文变体；去掉“有哪些”“怎么”这类问法词。",
  "只输出关键词，用英文逗号分隔，不要编号、解释或其他文字。",
].join("\n");

/** 正式回答前的轻量请求：让模型给出检索关键词；失败、超时或被取消都静默返回空数组。 */
export async function expandQueryTerms(question: string, signal: AbortSignal): Promise<string[]> {
  const modelCheck = buildLanguageModel();
  if (!modelCheck.ok) return [];
  try {
    const { text } = await generateText({
      model: modelCheck.model,
      system: SYSTEM,
      prompt: question,
      maxOutputTokens: 120,
      abortSignal: AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)]),
    });
    const terms = text.split(/[,，、;；\n]+/)
      .map(term => term.replace(/^[\s\d.)*\-"'“”]+|["'“”\s]+$/g, "").toLowerCase())
      .filter(term => term.length >= 2 && term.length <= 24);
    return [...new Set(terms)].slice(0, MAX_TERMS);
  } catch {
    return [];
  }
}
