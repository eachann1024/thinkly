import { getPageTitle } from "@/components/editor/utils/page-title";
import { getCachedText } from "../command/searchBodyCache";
import type { Page } from "@/types";

export interface NoteSource { id: string; title: string; excerpt: string }

const MAX_SOURCES = 6;
const EXCERPT_CHARS = 1400;
const WINDOW = 220;
const STOP = new Set("的了是在和与及或我你他她它们这那哪什么怎么如何为什么吗呢吧啊请帮把给对从到有没一个".split(""));

/** 问句拆成检索词：英文按词、中文按二字切片，去掉虚词。 */
export function questionTerms(question: string): string[] {
  const terms = new Set<string>();
  for (const word of question.toLowerCase().match(/[a-z0-9_.-]{2,}/g) ?? []) terms.add(word);
  for (const run of question.match(/[一-鿿]+/g) ?? []) {
    const chars = [...run].filter(c => !STOP.has(c)).join("");
    if (chars.length === 1) terms.add(chars);
    for (let i = 0; i + 1 < chars.length; i++) terms.add(chars.slice(i, i + 2));
  }
  return [...terms];
}

function countOf(haystack: string, needle: string) {
  let count = 0;
  for (let i = haystack.indexOf(needle); i >= 0 && count < 50; i = haystack.indexOf(needle, i + needle.length)) count++;
  return count;
}

/** 取命中最密集的几个窗口拼成摘录，没有命中就取开头。 */
function excerptOf(text: string, terms: string[]) {
  const lower = text.toLowerCase();
  const hits: number[] = [];
  for (const term of terms) for (let i = lower.indexOf(term); i >= 0 && hits.length < 40; i = lower.indexOf(term, i + term.length)) hits.push(i);
  if (!hits.length) return text.slice(0, EXCERPT_CHARS);
  hits.sort((a, b) => a - b);
  const parts: string[] = [];
  let end = -1, used = 0;
  for (const hit of hits) {
    if (hit < end || used >= EXCERPT_CHARS) continue;
    const start = Math.max(end, hit - WINDOW / 2);
    end = Math.min(text.length, start + WINDOW);
    parts.push(text.slice(start, end).replace(/\s+/g, " ").trim());
    used += end - start;
  }
  return parts.join(" … ");
}

/**
 * 参照 Notion Q&A 的检索增强做法：先检索、再只把相关片段交给模型，而不是塞入全部笔记。
 * 关键词搜索的命中排在前面，再用问句拆词与模型改写的检索词对候选页打分补足。
 */
export function retrieveNotes(question: string, candidates: Page[], ranked: Page[], extraTerms: string[] = []): NoteSource[] {
  const terms = [...new Set([...extraTerms, ...questionTerms(question)])];
  const scored = new Map<string, { page: Page; score: number }>();
  ranked.slice(0, MAX_SOURCES).forEach((page, index) => scored.set(page.id, { page, score: 1000 - index }));
  if (terms.length) {
    for (const page of candidates) {
      if (scored.has(page.id)) continue;
      const title = getPageTitle(page).toLowerCase();
      const body = getCachedText(page).toLowerCase();
      let score = 0, matched = 0;
      for (const term of terms) {
        const hit = countOf(title, term) * 6 + Math.min(countOf(body, term), 10);
        if (hit) { matched++; score += hit * term.length; }
      }
      if (matched) scored.set(page.id, { page, score: score * matched / terms.length });
    }
  }
  return [...scored.values()].sort((a, b) => b.score - a.score).slice(0, MAX_SOURCES)
    .map(({ page }) => ({ id: page.id, title: getPageTitle(page), excerpt: excerptOf(getCachedText(page), terms) }));
}

/** 预检索的笔记摘录作为起点，其余信息交给只读工具按需获取。 */
export function buildAgentPrompt(question: string, sources: NoteSource[]) {
  const context = sources.length
    ? sources.map((s, i) => `[${i + 1}] 《${s.title}》（pageId: ${s.id}）\n${s.excerpt}`).join("\n\n")
    : "（没有预检索到相关笔记）";
  const system = [
    "你是笔记搜索面板里的问答助手，可以多步调用只读工具完成回答，不能修改笔记。",
    "先看给出的笔记摘录；不够时用 searchNotes / readPage / listPages 查当前笔记本，问题涉及笔记以外的事实（天气、新闻、资料等）时用 searchWeb，必要时 readWebPage 读原文。",
    "回答用用户提问的语言，先给结论，简洁分点；引用笔记摘录时在句末标注来源编号如 [1]，引用网页时附上链接。",
    "确实查不到就直接说明，不要编造。",
  ].join("\n");
  return { system, prompt: `【笔记摘录】\n${context}\n\n【问题】\n${question}` };
}
