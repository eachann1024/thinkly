/**
 * 浮动搜索窗向主窗要的 AI 设置快照。
 * 主窗内存里的开关、密钥和模型才算数；搜索窗自己的本地副本可能还是旧的。
 */

export const SEARCH_AI_SETTINGS_PUBLISH_CHANNEL = "desktop:search-ai-settings-publish";
export const SEARCH_AI_SETTINGS_PUSH_CHANNEL = "desktop:search-ai-settings-push";

const PROTOCOLS = ["openai-responses", "openai", "claude"] as const;
const MAX_MODELS = 200;
/** 无效项不计入 200 条上限，扫描也要停，避免百万条脏数据拖过 50ms。 */
const MAX_MODEL_SOURCE_SCAN = 512;
const MAX_TEXT = 2_000;

export type SearchAIProtocol = (typeof PROTOCOLS)[number];

export type SearchAISettingsSnapshot = {
  enabled: boolean;
  selectedModelId: string | null;
  customProviderId: string;
  customProtocol: SearchAIProtocol;
  customOpenAIResponsesBaseURL: string;
  customOpenAIBaseURL: string;
  customClaudeBaseURL: string;
  customOpenAIResponsesApiKey: string;
  customOpenAIApiKey: string;
  customClaudeApiKey: string;
  customModelOptions: { id: string; label: string; description?: string }[];
  readGlobalPrompt: boolean;
  readLocalSkills: boolean;
  runtime: "legacy" | "pi";
  workspaceSelectedModelId: string | null;
  workspaceReasoningLevel: string;
  tinyfishApiKey: string;
  /** 主窗持久化恢复完成后才为 true。未恢复的默认值不能当作用户选择。 */
  hydrated: boolean;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.slice(0, MAX_TEXT) : "";
}

function modelOptions(value: unknown): SearchAISettingsSnapshot["customModelOptions"] {
  if (!Array.isArray(value)) return [];
  const options: SearchAISettingsSnapshot["customModelOptions"] = [];
  let scanned = 0;
  for (const item of value) {
    if (++scanned > MAX_MODEL_SOURCE_SCAN) break;
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const id = text(record.id).trim();
    const label = text(record.label).trim();
    if (!id || !label) continue;
    const description = text(record.description).trim();
    options.push(description ? { id, label, description } : { id, label });
    if (options.length >= MAX_MODELS) break;
  }
  return options;
}

/** 缺开关或形状不对时拒绝，避免用空对象盖掉搜索窗里已经可用的配置。 */
export function parseSearchAISettings(value: unknown): SearchAISettingsSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.enabled !== "boolean") return null;
  const protocol = PROTOCOLS.find((item) => item === record.customProtocol) ?? "openai-responses";
  const selected = text(record.selectedModelId).trim();
  const workspaceSelected = text(record.workspaceSelectedModelId).trim();
  const reasoning = text(record.workspaceReasoningLevel).trim();
  return {
    enabled: record.enabled,
    selectedModelId: selected || null,
    customProviderId: text(record.customProviderId).trim(),
    customProtocol: protocol,
    customOpenAIResponsesBaseURL: text(record.customOpenAIResponsesBaseURL),
    customOpenAIBaseURL: text(record.customOpenAIBaseURL),
    customClaudeBaseURL: text(record.customClaudeBaseURL),
    customOpenAIResponsesApiKey: text(record.customOpenAIResponsesApiKey),
    customOpenAIApiKey: text(record.customOpenAIApiKey),
    customClaudeApiKey: text(record.customClaudeApiKey),
    customModelOptions: modelOptions(record.customModelOptions),
    readGlobalPrompt: record.readGlobalPrompt !== false,
    readLocalSkills: record.readLocalSkills !== false,
    runtime: record.runtime === "legacy" ? "legacy" : "pi",
    workspaceSelectedModelId: workspaceSelected || null,
    workspaceReasoningLevel: reasoning || "default",
    tinyfishApiKey: text(record.tinyfishApiKey),
    hydrated: record.hydrated === true,
  };
}

function searchAISettingsBody(snapshot: SearchAISettingsSnapshot): string {
  return JSON.stringify({ ...snapshot, hydrated: undefined });
}

export function searchAISettingsMatch(
  left: SearchAISettingsSnapshot,
  right: SearchAISettingsSnapshot,
): boolean {
  return searchAISettingsBody(left) === searchAISettingsBody(right);
}

/**
 * 已恢复的快照才采用。用户关掉 AI 时覆盖本地。
 * 未恢复的默认值，以及比本地更不完整的缓存，都不降级。
 */
export function shouldApplySearchAISettings(
  current: SearchAISettingsSnapshot | null,
  snapshot: SearchAISettingsSnapshot | null,
): boolean {
  if (!snapshot?.hydrated) return false;
  if (!current) return true;
  if (searchAISettingsMatch(current, snapshot)) return false;
  if (!snapshot.enabled) return true;
  return searchAISettingsRank(snapshot) >= searchAISettingsRank(current);
}

/**
 * 内存和磁盘一致，或内存比磁盘更完整时才发布。
 * 另一扇窗已经写过更完整的磁盘时，本窗旧内存不发布。
 */
export function shouldPublishWorkspaceAI(
  memory: SearchAISettingsSnapshot | null,
  disk: SearchAISettingsSnapshot | null,
): boolean {
  if (!memory?.hydrated) return false;
  if (!disk) return true;
  if (searchAISettingsMatch(memory, disk)) return true;
  return searchAISettingsRank(memory) > searchAISettingsRank(disk);
}

/** 配置完整度。套用时用来拒绝更差的缓存，不用它挡住用户关掉 AI。 */
export function searchAISettingsRank(snapshot: SearchAISettingsSnapshot): number {
  if (!snapshot.enabled) return 0;
  const key = snapshot.customOpenAIResponsesApiKey.trim()
    || snapshot.customOpenAIApiKey.trim()
    || snapshot.customClaudeApiKey.trim();
  if (!key) return 1;
  if (!snapshot.selectedModelId && snapshot.customModelOptions.length === 0) return 2;
  return 3;
}
