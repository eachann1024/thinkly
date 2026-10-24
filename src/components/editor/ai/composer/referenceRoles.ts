import type {
  AiComposerPayload,
  AiComposerToken,
  AiFileReferenceAttrs,
  AiReferenceOccurrence,
  AiReferenceRole,
  NormalizedAiComposerPayload,
} from "./referenceTypes";

const TARGET_CUE_PATTERN =
  /(生成到|写到|写入到|写进|放到|放进|保存到|同步到|输出到|替换到|覆盖到|改写到|更新到|汇总到|合并到|追加到|删除|移除|重命名|改名)/i;
const TARGET_PREFIX_PATTERN = /(删除|移除|重命名|改名)$/i;
const CONTEXT_CUE_PATTERN =
  /(参考|参照|结合|基于|根据|对照|引用|读取|查看|分析|汇总)/i;

function collectReferenceNeighborText(
  tokens: AiComposerToken[],
  index: number,
  direction: "before" | "after",
  maxLength = 24,
) {
  let remaining = maxLength;
  let cursor = direction === "before" ? index - 1 : index + 1;
  const parts: string[] = [];
  while (cursor >= 0 && cursor < tokens.length && remaining > 0) {
    const token = tokens[cursor];
    if (token.type !== "text") break;
    const text = token.text;
    const slice =
      direction === "before"
        ? text.slice(Math.max(0, text.length - remaining))
        : text.slice(0, remaining);
    if (direction === "before") parts.unshift(slice);
    else parts.push(slice);
    remaining -= slice.length;
    cursor += direction === "before" ? -1 : 1;
  }
  return parts.join("").replace(/\s+/g, "");
}

export function inferAiReferenceRole(
  tokens: AiComposerToken[],
  tokenIndex: number,
): Pick<AiReferenceOccurrence, "role" | "roleSource"> {
  const token = tokens[tokenIndex];
  if (token?.type !== "reference") {
    return { role: "context", roleSource: "default" };
  }
  const explicitRole = token.role ?? token.reference.role;
  if (explicitRole) return { role: explicitRole, roleSource: "explicit" };
  const before = collectReferenceNeighborText(tokens, tokenIndex, "before");
  const after = collectReferenceNeighborText(tokens, tokenIndex, "after");
  if (TARGET_CUE_PATTERN.test(before) || TARGET_PREFIX_PATTERN.test(after)) {
    return { role: "target", roleSource: "inferred" };
  }
  if (CONTEXT_CUE_PATTERN.test(before) || CONTEXT_CUE_PATTERN.test(after)) {
    return { role: "context", roleSource: "inferred" };
  }
  return { role: "context", roleSource: "default" };
}

export function normalizeAiComposerPayload(
  input: AiComposerPayload,
): NormalizedAiComposerPayload {
  const resources: AiFileReferenceAttrs[] = [];
  const resourceMap = new Map<string, AiFileReferenceAttrs>();
  const occurrences: AiReferenceOccurrence[] = [];
  const keyOf = (ref: AiFileReferenceAttrs) => `${ref.workspaceId}:${ref.pageId}`;

  input.tokens.forEach((token, tokenIndex) => {
    if (token.type !== "reference" || !token.reference.pageId) return;
    const { role, roleSource } = inferAiReferenceRole(input.tokens, tokenIndex);
    if (!resourceMap.has(keyOf(token.reference))) {
      const resource = { ...token.reference };
      delete resource.role;
      resourceMap.set(keyOf(token.reference), resource);
      resources.push(resource);
    }
    occurrences.push({
      occurrenceId: `${token.reference.pageId}:${tokenIndex}`,
      tokenIndex,
      pageId: token.reference.pageId,
      workspaceId: token.reference.workspaceId,
      role,
      roleSource,
    });
  });

  input.references.forEach((reference) => {
    if (!reference.pageId || resourceMap.has(keyOf(reference))) return;
    const resource = { ...reference };
    delete resource.role;
    resourceMap.set(keyOf(reference), resource);
    resources.push(resource);
    occurrences.push({
      occurrenceId: `${reference.pageId}:legacy-${occurrences.length}`,
      tokenIndex: -1,
      pageId: reference.pageId,
      workspaceId: reference.workspaceId,
      role: reference.role ?? "context",
      roleSource: reference.role ? "explicit" : "default",
    });
  });

  const rolesByPage = new Map<string, Set<AiReferenceRole>>();
  occurrences.forEach((occurrence) => {
    const roles =
      rolesByPage.get(`${occurrence.workspaceId}:${occurrence.pageId}`) ?? new Set<AiReferenceRole>();
    roles.add(occurrence.role);
    rolesByPage.set(`${occurrence.workspaceId}:${occurrence.pageId}`, roles);
  });
  const referencesForRole = (role: AiReferenceRole) => resources.flatMap((reference) => {
    const occurrence = occurrences.find((item) => item.pageId === reference.pageId && item.workspaceId === reference.workspaceId && item.role === role);
    if (!occurrence) return [];
    const token = input.tokens[occurrence.tokenIndex];
    const attrs = token?.type === "reference" ? token.reference : input.references.find((item) => keyOf(item) === keyOf(reference)) ?? reference;
    return [{ ...attrs, role }];
  });
  const contextReferences = referencesForRole("context");
  const targetReferences = referencesForRole("target");

  return {
    payload: { ...input, references: resources },
    resources,
    occurrences,
    contextReferences,
    targetReferences,
    hasRoleConflict: [...rolesByPage.values()].some((roles) => roles.size > 1),
  };
}
