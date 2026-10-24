import { usePages } from "@/stores/usePages";
import { useNotebooks } from "@/stores/useNotebooks";
import { useTabs } from "@/stores/useTabs";
import {
  buildAiFileReferenceAttrs,
  getAiReferenceSuggestionItems,
  normalizeAiComposerPayload,
  resolveAiReferenceContexts,
  type AiComposerPayload,
  type AiFileReferenceAttrs,
  type AiReferenceSuggestionItem,
  type AiSkillCommandAttrs,
} from "@/components/editor/ai/composer/referenceLookup";
import {
  resolveInvokedLocalSkill,
  resolveInvokedLocalSkillFromTokens,
} from "./localContext";
import { formatSelectionQuoteModelBlock } from "@/components/editor/ai/composer/selectionQuote";
import { useSettings } from "@/stores/useSettings";
import type { NotebookAiMessageMetadata } from "./types";
import { toResourceReference, formatResourceManifest } from "./readResourceScope";

function dedupeReferences(references: AiFileReferenceAttrs[]) {
  const seen = new Set<string>();
  return references.filter((reference) => {
    const key = `${reference.workspaceId}:${reference.pageId}`;
    if (!reference.pageId || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getCurrentNotebookAiPageId(notebookId: string): string | null {
  const pages = usePages.getState().pages;
  const { openTabs, activeTabId } = useTabs.getState();
  const activeTab = openTabs.find((tab) => tab.id === activeTabId);
  const tabPageId = activeTab?.type === "welcome" ? null : activeTab?.pageId;
  const fallbackPageId = usePages.getState().activePageId;
  const candidates = [tabPageId, fallbackPageId].filter(Boolean) as string[];

  for (const pageId of candidates) {
    const page = pages[pageId];
    if (
      !page ||
      page.workspaceId !== notebookId ||
      page.trashedAt ||
      page.isFolder
    ) {
      continue;
    }
    return page.id;
  }

  return null;
}

export function getNotebookAiReferenceSuggestions(
  query: string,
  notebookId: string,
): AiReferenceSuggestionItem[] {
  const { pages } = usePages.getState();
  const { notebooks } = useNotebooks.getState();
  return getAiReferenceSuggestionItems(query, pages, notebooks, notebookId, {
    includeFolders: true,
    priorityPageId: getCurrentNotebookAiPageId(notebookId),
  });
}

import { buildNotebookAiContextSelection } from "./contextSelection";
export {
  NOTEBOOK_AI_CONTEXT_CHARACTER_BUDGETS,
  selectNotebookAiContextMode,
  getNotebookAiContextBudgetTier,
  buildNotebookAiContextSelection,
  type NotebookAiContextSelection,
} from "./contextSelection";

function resolveContextSelection(params: {
  promptText: string;
  references: AiFileReferenceAttrs[];
  uniqueReferenceCount: number;
  occurrenceCount: number;
  imageCount?: number;
}) {
  const contexts = resolveAiReferenceContexts(
    params.references,
    usePages.getState().pages,
    useNotebooks.getState().notebooks,
  );
  return buildNotebookAiContextSelection({ ...params, contexts });
}

function getImplicitPage(notebookId: string, currentPageId?: string | null) {
  if (!currentPageId) return undefined;
  const page = usePages.getState().pages[currentPageId];
  if (
    !page ||
    page.workspaceId !== notebookId ||
    page.trashedAt ||
    page.isFolder
  ) {
    return undefined;
  }
  return buildAiFileReferenceAttrs(page, useNotebooks.getState().notebooks, usePages.getState().pages);
}

export function buildNotebookAiUserMessage(params: {
  payload: AiComposerPayload;
  notebookId: string;
  currentPageId?: string | null;
  /**
   * AI 面板会把当前笔记作为显式、可移除的上下文项传入；移除后不能再
   * 回退为隐式当前页，否则用户无法发起完全脱离笔记的提问。
   */
  useImplicitPage?: boolean;
}): {
  modelText: string;
  metadata: NotebookAiMessageMetadata;
  currentPageId: string | null;
} {
  const currentPageId =
    params.currentPageId ?? getCurrentNotebookAiPageId(params.notebookId);
  const normalized = normalizeAiComposerPayload(params.payload);
  const references = dedupeReferences(normalized.resources);
  const explicitContextReferences = dedupeReferences(
    normalized.contextReferences,
  );
  const implicitPage =
    params.useImplicitPage !== false && references.length === 0
      ? getImplicitPage(params.notebookId, currentPageId)
      : undefined;
  // target 只用于后续工具写入定位，不把其正文作为本轮读取上下文。
  const contextReferences =
    explicitContextReferences.length > 0
      ? explicitContextReferences
      : implicitPage
        ? [implicitPage]
        : [];
  const displayText = params.payload.promptText.trim();
  const invokedSkill = useSettings.getState().ai.readLocalSkills
    ? (resolveInvokedLocalSkillFromTokens(params.payload.tokens) ??
      resolveInvokedLocalSkill(displayText))
    : null;
  const contextSelection = resolveContextSelection({
    promptText: displayText,
    references: contextReferences,
    uniqueReferenceCount: references.length || (implicitPage ? 1 : 0),
    occurrenceCount: normalized.occurrences.length || (implicitPage ? 1 : 0),
    imageCount: params.payload.images?.length,
  });
  const contextBlock = contextSelection.contextBlock;
  const resourceReferences = [
    ...contextReferences.map((reference) => toResourceReference(reference, "source")),
    ...normalized.targetReferences.map((reference) => toResourceReference(reference, "target")),
  ];
  const contextIntro =
    explicitContextReferences.length > 0
      ? `用户为本轮选择了以下笔记作为上下文。单页按${contextSelection.mode === "full-text" ? "全文" : "结构摘要"}模式提供，目录仅提供索引；先按需读取子页，再基于实际已读内容回答。`
      : implicitPage
        ? `用户没有 @ 其它笔记。默认把当前活动页签对应的笔记作为本轮关联页面，并按${contextSelection.mode === "full-text" ? "全文" : "结构摘要"}模式读取；“当前页 / 本文 / 这篇”都指向该页面。`
        : "";
  const selectionQuotes = params.payload.selectionQuotes?.length
    ? params.payload.selectionQuotes
    : params.payload.tokens
        .filter(
          (
            token,
          ): token is Extract<
            (typeof params.payload.tokens)[number],
            { type: "selectionQuote" }
          > => token.type === "selectionQuote",
        )
        .map((token) => token.quote);
  const quoteBlock = formatSelectionQuoteModelBlock(selectionQuotes);
  const modelText = [
    "用户输入：",
    displayText,
    formatResourceManifest(resourceReferences),
    quoteBlock
      ? ["用户加入的选区引用（含完整原文，请阅读）：", quoteBlock].join("\n")
      : "",
    invokedSkill
      ? `用户通过 /${invokedSkill.name} 显式调用以下本地 Skill。请遵循其说明执行：\n\n${invokedSkill.content}`
      : "",
    contextBlock
      ? [
          "本轮笔记上下文：",
          contextIntro,
          contextBlock,
          implicitPage
            ? `当前关联页 notebookId：${implicitPage.workspaceId}，pageId：${implicitPage.pageId}；只有用户明确要求修改时才生成写入范围。修改前先 readPage，再通过 executeBatchPlan 提交审批计划。`
            : "",
        ]
          .filter(Boolean)
          .join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  // skills 合并去重：payload.skills → tokens 中 skill → 仍空则用 invokedSkill
  const skills = collectNotebookAiMessageSkills(params.payload, invokedSkill);

  return {
    modelText,
    currentPageId,
    metadata: {
      displayText,
      resourceReferences,
      references: references.length > 0 ? references : undefined,
      skills,
      selectionQuotes: selectionQuotes.length > 0 ? selectionQuotes : undefined,
      implicitPage,
      diagnostics: contextSelection.diagnostics,
    },
  };
}

/**
 * 组装消息 metadata.skills：按 name 去重（首次优先）。
 * 1. payload.skills
 * 2. payload.tokens 中 type==="skill"
 * 3. 仍空且 invokedSkill 非空 → 补一条
 */
export function collectNotebookAiMessageSkills(
  payload: {
    skills?: AiSkillCommandAttrs[];
    tokens?: Array<{ type: string; skill?: AiSkillCommandAttrs }>;
  },
  invokedSkill?: {
    name: string;
    path?: string;
    description?: string;
  } | null,
): AiSkillCommandAttrs[] | undefined {
  const byName = new Map<string, AiSkillCommandAttrs>();
  const add = (skill: AiSkillCommandAttrs) => {
    const key = skill.name?.trim().toLowerCase();
    if (!key || byName.has(key)) return;
    byName.set(key, {
      name: skill.name.trim(),
      ...(skill.path ? { path: skill.path } : {}),
      ...(skill.description ? { description: skill.description } : {}),
    });
  };

  for (const skill of payload.skills ?? []) {
    if (skill?.name) add(skill);
  }
  for (const token of payload.tokens ?? []) {
    if (token.type === "skill" && token.skill?.name) {
      add(token.skill);
    }
  }
  if (byName.size === 0 && invokedSkill?.name) {
    add({
      name: invokedSkill.name,
      path: invokedSkill.path,
      description: invokedSkill.description,
    });
  }

  return byName.size > 0 ? Array.from(byName.values()) : undefined;
}
