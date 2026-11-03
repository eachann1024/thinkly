import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// 用 gemini 3.8 把「上一版 → 这一版」的面向用户提交整理成三类更新日志。
// 网关地址和密钥只从环境变量读：MAGPIE_BASE_URL（必需）、MAGPIE_API_KEY（网关要求鉴权时才需要）、
// CHANGELOG_MODEL（可选，默认 gemini 3.8）。读不到或调用失败时返回 fallback，由调用方退回逐条提交标题。
export const DEFAULT_CHANGELOG_MODEL = "antigravity/gemini-3.8-flash";
export const SECTION_ORDER = ["新增", "优化", "修复"];
const PROMPT_PATH = resolve(fileURLToPath(new URL(".", import.meta.url)), "changelog-prompt.md");
const MAX_ATTEMPTS = 2;
const TIMEOUT_MS = 120_000;
const MAX_PER_SECTION = 6;
const TECH_WORDS = /\b(?:ci|pr|lint|refactor|typecheck|ipc|commit|feat|fix|chore|build|hydration|debounce|renderer|electron|sdk|npm|bun)\b|#\d+|\b[0-9a-f]{7,40}\b|`|类型检查|重构|构建|打包|脚本|测试|提交记录|发版|发布流程|主进程|渲染进程|依赖/i;
const VAGUE = /^(?:修复了?)?(?:优化了?性能|提升了?体验|一些已知问题|若干细节|细节调整|修复了?一些问题)[。.]?$/;

export function readChangelogPrompt() {
  return readFileSync(PROMPT_PATH, "utf8");
}

export function commitInputLines(commits) {
  return commits.map(({ subject, releaseNote = "" }) => {
    const title = subject.replace(/\s*\(#\d+\)$/, "").trim();
    return releaseNote.trim() ? `${title} | ${releaseNote.trim()}` : title;
  });
}

function stripFence(text) {
  return text.replace(/\r\n?/g, "\n").trim().replace(/^```(?:markdown|md)?\n([\s\S]*?)\n```$/i, "$1").trim();
}

// 通过校验返回 Markdown 行数组；模型判断没有用户可感知改动时返回 []；不合格时抛错并说明原因。
export function validatePolishedMarkdown(raw) {
  const text = stripFence(raw);
  if (text === "无") return [];
  const out = [];
  let section = -1;
  let count = 0;
  for (const line of text.split("\n").map((value) => value.trim()).filter(Boolean)) {
    const heading = /^###\s+(.+)$/.exec(line);
    if (heading) {
      const next = SECTION_ORDER.indexOf(heading[1].trim());
      assert.ok(next >= 0, `出现了三类以外的标题：${line}`);
      assert.ok(next > section, `分类顺序或重复有误：${line}`);
      assert.ok(section < 0 || count > 0, `「${SECTION_ORDER[section]}」下没有条目`);
      if (out.length) out.push("");
      out.push(`### ${SECTION_ORDER[next]}`);
      section = next;
      count = 0;
      continue;
    }
    const bullet = /^[-*•]\s+(.+)$/.exec(line);
    assert.ok(bullet, `出现了标题和条目以外的内容：${line}`);
    assert.ok(section >= 0, `条目出现在分类标题之前：${line}`);
    const item = bullet[1].replace(/\*\*/g, "").trim();
    assert.ok(!TECH_WORDS.test(item), `条目含技术性内容：${item}`);
    assert.ok(!VAGUE.test(item), `条目是空话：${item}`);
    count += 1;
    assert.ok(count <= MAX_PER_SECTION, `「${SECTION_ORDER[section]}」超过 ${MAX_PER_SECTION} 条`);
    out.push(`- ${/[。！？]$/.test(item) ? item : `${item}。`}`);
  }
  assert.ok(section >= 0, "输出里没有任何分类");
  assert.ok(count > 0, `「${SECTION_ORDER[section]}」下没有条目`);
  return out;
}

function chatUrl(baseUrl) {
  return `${baseUrl.trim().replace(/\/+$/, "").replace(/\/v1$/, "")}/v1/chat/completions`;
}

async function requestPolish({ baseUrl, apiKey, model, version, lines, fetchImpl }) {
  const headers = { "content-type": "application/json" };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;
  const response = await fetchImpl(chatUrl(baseUrl), {
    method: "POST",
    headers,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        { role: "system", content: readChangelogPrompt() },
        { role: "user", content: `Thinkly ${version} 的提交记录（共 ${lines.length} 条）：\n\n${lines.join("\n")}` },
      ],
    }),
  });
  assert.ok(response.ok, `网关返回 HTTP ${response.status}`);
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  assert.ok(typeof content === "string" && content.trim(), "模型没有返回内容");
  return { content, servedModel: data.model || model };
}

/**
 * @returns {Promise<{status: "polished", lines: string[], model: string} | {status: "empty", model: string} | {status: "fallback", reason: string}>}
 */
export async function polishChangelog({ version, commits, env = process.env, fetchImpl = fetch }) {
  const baseUrl = env.MAGPIE_BASE_URL?.trim();
  if (!baseUrl) return { status: "fallback", reason: "没有设置 MAGPIE_BASE_URL，跳过 gemini 3.8 润色" };
  const model = env.CHANGELOG_MODEL?.trim() || DEFAULT_CHANGELOG_MODEL;
  const lines = commitInputLines(commits);
  if (!lines.length) return { status: "fallback", reason: "没有可润色的提交" };
  let reason = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const { content, servedModel } = await requestPolish({
        baseUrl, apiKey: env.MAGPIE_API_KEY?.trim(), model, version, lines, fetchImpl,
      });
      const polished = validatePolishedMarkdown(content);
      if (!polished.length) return { status: "empty", model: servedModel };
      return { status: "polished", lines: polished, model: servedModel };
    } catch (error) {
      reason = `第 ${attempt} 次润色失败：${error?.message || error}`;
      console.warn(reason);
    }
  }
  return { status: "fallback", reason };
}

export function fallbackNotice(reason) {
  return `⚠️ 更新日志未经 gemini 3.8 润色，退回逐条提交标题（${reason}）。发版前可在本机运行 node scripts/release/write-changelog.mjs --write 生成润色版。`;
}
