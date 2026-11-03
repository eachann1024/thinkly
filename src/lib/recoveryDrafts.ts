import type { RecoveryJournalEntry } from "@/lib/storage/recoveryJournal";
import { getGooseDesktop } from "@/lib/electron/runtime";

export function openRecoveryDrafts(): void {
  const open = getGooseDesktop()?.auxiliary?.open;
  if (!open) return;
  void open({ kind: "recovery-drafts" }).catch((error: unknown) => {
    console.error("[recovery-drafts] window failed to open", error);
  });
}

export function buildRecoveryDraftExport(entry: RecoveryJournalEntry): {
  filename: string;
  json: string;
} {
  const safeId = entry.id.replace(/[^\p{L}\p{N}._-]+/gu, "-").slice(0, 80) || "draft";
  const envelope = {
    format: "thinkly-recovery-draft",
    version: 1,
    exportedAt: new Date().toISOString(),
    entry,
  };
  return {
    filename: `thinkly-recovery-${entry.source}-${safeId}-r${entry.revision}.json`,
    json: `${JSON.stringify(envelope, null, 2)}\n`,
  };
}

export function buildRecoveryDraftPreview(
  content: RecoveryJournalEntry["content"],
  limit = 3500,
  maxNodes = 450,
): string {
  if (!content || limit <= 0 || maxNodes <= 0) return "";
  const output: string[] = [];
  let visited = 0;
  let chars = 0;
  const visit = (value: unknown) => {
    if (visited >= maxNodes || chars >= limit) return;
    visited += 1;
    if (typeof value === "string") {
      const text = value.slice(0, limit - chars);
      output.push(text);
      chars += text.length;
      return;
    }
    if (Array.isArray(value)) {
      for (const child of value) {
        if (visited >= maxNodes || chars >= limit) break;
        visit(child);
      }
      return;
    }
    if (!value || typeof value !== "object") return;
    const node = value as Record<string, unknown>;
    if (node.type === "text" && typeof node.text === "string") {
      const text = node.text.slice(0, limit - chars);
      output.push(text);
      chars += text.length;
    }
    if (node.type === "heading") {
      output.push("\n");
      chars += 1;
    }
    for (const field of ["content", "children", "rows", "cells"]) {
      if (chars >= limit || visited >= maxNodes) break;
      const child = node[field];
      if (!Array.isArray(child) && (!child || typeof child !== "object")) continue;
      visit(child);
      if (field === "content" && ["paragraph", "heading", "bulletListItem", "numberedListItem", "checkListItem", "tableRow", "tableCell"].includes(String(node.type))) {
        output.push("\n");
        chars += 1;
      }
    }
  };
  visit(content);
  return output.join("").slice(0, limit).replace(/\n{3,}/g, "\n\n").trim();
}
