import { getPageTitle } from "@/components/editor/utils/page-title";
import { getCachedText } from "../command/searchBodyCache";
import type { Page } from "@/types";

export interface NoteSource { id: string; title: string; excerpt: string }
interface Terms { strong: string[]; weak: string[] }

const MAX_SOURCES = 6;
const TOTAL_BUDGET = 4200;
const SOURCE_CHARS = { min: 360, max: 1200 };
const WINDOW = 240;
const RELATIVE_FLOOR = 0.35;
const MIN_SCORE = 3;
const WEAK_COVERAGE = 0.6;
const STOP = new Set("的了是在和与及或我你他她它们这那哪些什么怎么如何为什么吗呢吧啊请帮把给对从到有没一个".split(""));
const EN_STOP = new Set("what which how why who the and for are is was do does did our we you have has any about with from that this there".split(" "));

export function questionTerms(question: string, extraTerms: string[] = []): Terms {
  const strong = new Set(extraTerms.map(term => term.trim().toLowerCase()).filter(term => term.length >= 2));
  const weak = new Set<string>();
  for (const word of question.toLowerCase().match(/[a-z0-9_.-]{2,}/g) ?? []) if (!EN_STOP.has(word)) strong.add(word);
  for (const run of question.match(/[一-鿿]+/g) ?? []) {
    for (const segment of [...run].map(c => STOP.has(c) ? " " : c).join("").split(" ")) {
      if (segment.length >= 2) strong.add(segment);
      if (segment.length >= 3) for (let i = 0; i + 1 < segment.length; i++) weak.add(segment.slice(i, i + 2));
    }
  }
  return { strong: [...strong], weak: [...weak].filter(term => !strong.has(term)) };
}

function countOf(haystack: string, needle: string, cap = 50) {
  let count = 0;
  for (let i = haystack.indexOf(needle); i >= 0 && count < cap; i = haystack.indexOf(needle, i + needle.length)) count++;
  return count;
}

function scorePage(title: string, body: string, terms: Terms) {
  let score = 0, matched = 0;
  for (const term of terms.strong) {
    const inTitle = title.includes(term);
    const inBody = countOf(body, term, 5);
    if (!inTitle && !inBody) continue;
    matched++;
    score += (Math.min(term.length, 6) / 2) * ((inTitle ? 10 : 0) + 3 + inBody);
  }
  if (matched) score *= 1 + (matched - 1) * 0.25;
  if (terms.weak.length) {
    const covered = terms.weak.filter(term => title.includes(term) || body.includes(term)).length / terms.weak.length;
    if (covered >= WEAK_COVERAGE) score += covered * 4;
  }
  return score;
}

function excerptOf(text: string, terms: string[], limit: number) {
  const lower = text.toLowerCase();
  const hits: number[] = [];
  for (const term of terms) for (let i = lower.indexOf(term); i >= 0 && hits.length < 40; i = lower.indexOf(term, i + term.length)) hits.push(i);
  if (!hits.length) return text.slice(0, Math.min(limit, 300)).replace(/\s+/g, " ").trim();
  hits.sort((a, b) => a - b);
  const parts: string[] = [];
  let end = -1, used = 0;
  for (const hit of hits) {
    if (hit < end || used >= limit) continue;
    const start = Math.max(end, hit - WINDOW / 2, 0);
    end = Math.min(text.length, start + WINDOW);
    parts.push(text.slice(start, end).replace(/\s+/g, " ").trim());
    used += end - start;
  }
  return parts.join(" … ");
}

export function retrieveNotes(question: string, candidates: Page[], ranked: Page[], extraTerms: string[] = []): NoteSource[] {
  const terms = questionTerms(question, extraTerms);
  if (!terms.strong.length && !terms.weak.length) return [];
  const rankOf = new Map(ranked.slice(0, 10).map((page, index) => [page.id, index]));
  const pool = new Map<string, Page>();
  for (const page of [...ranked.slice(0, 10), ...candidates]) pool.set(page.id, page);
  const scored: Array<{ page: Page; score: number }> = [];
  for (const page of pool.values()) {
    let score = scorePage(getPageTitle(page).toLowerCase(), getCachedText(page).toLowerCase(), terms);
    const rank = rankOf.get(page.id);
    if (score > 0 && rank !== undefined) score *= 1.2 - rank * 0.02;
    if (score >= MIN_SCORE) scored.push({ page, score });
  }
  scored.sort((a, b) => b.score - a.score);
  const floor = (scored[0]?.score ?? 0) * RELATIVE_FLOOR;
  const kept = scored.filter(item => item.score >= floor).slice(0, MAX_SOURCES);
  const total = kept.reduce((sum, item) => sum + item.score, 0);
  const excerptTerms = [...terms.strong, ...terms.weak];
  return kept.map(({ page, score }) => {
    const limit = Math.round(Math.min(SOURCE_CHARS.max, Math.max(SOURCE_CHARS.min, TOTAL_BUDGET * score / total)));
    return { id: page.id, title: getPageTitle(page), excerpt: excerptOf(getCachedText(page), excerptTerms, limit) };
  });
}

import { CARD_GUIDE } from "@/lib/notebook-ai/cardGuide";

export function buildAgentPrompt(question: string, sources: NoteSource[], scopeLabel: string, allNotebooks: boolean) {
  const context = sources.length
    ? sources.map((s, i) => `[${i + 1}] 《${s.title}》（pageId: ${s.id}）\n${s.excerpt}`).join("\n\n")
    : "（没有预检索到相关笔记）";
  const scope = allNotebooks
    ? `本次检索范围：${scopeLabel}。searchNotes / listPages / readPage 覆盖范围内的所有笔记本，回答时按“全部笔记”表述，不要说成某一个笔记本。`
    : `本次检索范围：笔记本「${scopeLabel}」。searchNotes / listPages / readPage 只覆盖这个笔记本。`;
  const system = [
    "你是笔记搜索面板里的问答助手，可以多步调用只读工具完成回答，不能修改笔记。",
    scope,
    "先看给出的笔记摘录，摘录只是按相关度挑出的片段，与问题无关的直接忽略；不够时再用笔记工具查找，问题涉及笔记以外的事实时联网：天气 getWeather、汇率 getExchangeRate、时间时差 getWorldTime、币价 getCryptoPrice，其他资料、新闻用 searchWeb，必要时 readWebPage 读原文。",
    CARD_GUIDE,,
    "回答用用户提问的语言，先给结论，简洁分点；引用摘录时在句末标注其编号如 [1]，只标注真正用到的；通过 readPage 读到的其他页面直接写出页面标题，不要自编编号；引用网页时附上链接。",
    "确实查不到就直接说明，不要编造。",
  ].join("\n");
  return { system, prompt: `【笔记摘录】\n${context}\n\n【问题】\n${question}` };
}
