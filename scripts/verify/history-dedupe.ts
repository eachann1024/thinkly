import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { HistoryBackend } from "@/lib/history/backend";
import { filterAdjacentDuplicateHistoryEntries } from "@/lib/history/dedupe";
import { getHistoryContentSignature, getHistoryVisibleSignature } from "@/lib/history/contentSignature";
import { parseHistoryVersion } from "@/lib/history/versionReadCache";
import type { HistoryIndex, HistoryIndexEntry, HistoryVersion } from "@/lib/history/types";
import { createChecker } from "./lib/check";

const version = (versionId: string, createdAt: number, content: any, localFrontmatter?: string): HistoryVersion => ({
  versionId, pageId: "history-dedupe-page", workspaceId: "workspace", createdAt,
  trigger: "manual", isMilestone: false, charCount: 0, charDelta: 0, size: 0,
  content, ...(localFrontmatter === undefined ? {} : { localFrontmatter }),
});

export default async function run(): Promise<number> {
  const checker = createChecker();
  const check = checker.check;
  const base = [{ id: "internal-a", type: "paragraph", props: {}, content: [{ type: "text", text: "same", styles: {} }], children: [] }];
  const reordered = [{ children: [], content: [{ styles: {}, text: "same", type: "text" }], props: { textAlignment: "left", textColor: "default", backgroundColor: "default" }, type: "paragraph", id: "internal-b" }];
  check("内部 id、属性顺序、默认 props 不改变签名", getHistoryContentSignature(base) === getHistoryContentSignature(reordered));
  const defaulted = [
    { type: "heading", props: { level: 1, collapsed: false, isToggleable: false }, content: "标题" },
    { type: "toggleListItem", props: { collapsed: false }, content: "项目" },
    { type: "codeBlock", props: { wrap: false, collapsed: false, summary: "" }, content: "code" },
    { type: "table", props: { sequenceColumn: false } },
  ];
  const withoutDefaults = defaulted.map(({ type, content }) => ({ type, ...(content === undefined ? {} : { content }) }));
  check("标题、折叠列表、代码块和表格默认 props 不改变签名", getHistoryContentSignature(defaulted as any) === getHistoryContentSignature(withoutDefaults as any));

  const content = [{ type: "paragraph", content: [{ type: "text", text: "same", styles: {} }] }];
  const noSettings = getHistoryVisibleSignature(content as any);
  check("缺失、空 frontmatter 与空 YAML 等价", noSettings === getHistoryVisibleSignature(content as any, "") && noSettings === getHistoryVisibleSignature(content as any, "---\n---"));

  const cases = [
    { name: "内部表示差异被合并", a: content, b: [{ type: "paragraph", props: { backgroundColor: "default" }, content: [{ text: "same", type: "text", styles: {} }], id: "new" }] },
    { name: "加粗变化保留", a: content, b: [{ type: "paragraph", content: [{ type: "text", text: "same", styles: { bold: true } }] }] },
    { name: "文字颜色变化保留", a: content, b: [{ type: "paragraph", content: [{ type: "text", text: "same", styles: { textColor: "red" } }] }] },
    { name: "对齐变化保留", a: content, b: [{ type: "paragraph", props: { textAlignment: "center" }, content: [{ type: "text", text: "same", styles: {} }] }] },
    { name: "空格变化保留", a: content, b: [{ type: "paragraph", content: [{ type: "text", text: "same ", styles: {} }] }] },
    { name: "同字数改词保留", a: content, b: [{ type: "paragraph", content: [{ type: "text", text: "word", styles: {} }] }] },
    { name: "结构变化保留", a: content, b: [{ type: "heading", props: { level: 2 }, content: [{ type: "text", text: "same", styles: {} }] }] },
    { name: "图片地址变化保留", a: [{ type: "image", props: { url: "/assets/a.png" } }], b: [{ type: "image", props: { url: "/assets/b.png" } }] },
  ];

  for (const item of cases) {
    const entries: HistoryIndexEntry[] = [1, 2].map((n) => ({ versionId: `${item.name}-${n}`, createdAt: n, trigger: "manual", isMilestone: false, charCount: 0, charDelta: 0, size: 0 }));
    const serialized = new Map(entries.map((entry, index) => {
      const current = version(entry.versionId, entry.createdAt, index ? item.b as any : item.a as any);
      return [entry.versionId, JSON.stringify(current)] as const;
    }));
    const backend: HistoryBackend = {
      async loadIndex(pageId): Promise<HistoryIndex> { return { pageId, versions: entries, lastVersionCharCount: 0 }; },
      async saveIndex() {},
      async loadVersion(pageId, versionId) {
        const raw = serialized.get(versionId);
        return raw ? parseHistoryVersion(`verify:${item.name}:${versionId}`, raw, pageId, versionId) : null;
      },
      async saveVersion() {}, async removeVersion() {}, async dropAll() {},
    };
    const filtered = await filterAdjacentDuplicateHistoryEntries("history-dedupe-page", entries, backend);
    const shouldKeepBoth = item.name !== "内部表示差异被合并";
    check(item.name, shouldKeepBoth ? filtered.length === 2 : filtered.length === 1, filtered.map((entry) => entry.versionId));
  }

  const hook = await readFile(resolve("src/hooks/useHistoryRecorder.ts"), "utf8");
  check("页面切换时撤回清理 pending", /pendingRef\.current = null;[\s\S]*?\}, \[pageId\]\)/.test(hook));
  const revertEffect = hook.slice(hook.lastIndexOf("const fingerprint = getHistoryContentSignature(content)"));
  const revertGuard = revertEffect.indexOf("!recordingRef.current") < revertEffect.indexOf("fingerprint === lastRecordedFingerprintRef.current");
  const clearsPendingAfterRevert = revertEffect.indexOf("fingerprint === lastRecordedFingerprintRef.current") < revertEffect.indexOf("pendingRef.current = null");
  check("无正在写入且指纹回到已记录内容时清理 pending", revertGuard && clearsPendingAfterRevert);
  return checker.failed;
}
