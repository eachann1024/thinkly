import type { LocalSkill } from "./localContext";
import { searchLocalSkills } from "./localContext";
import type { AiComposerPayload } from "@/components/editor/ai/composer/referenceLookup";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/lib/notebook-ai/composerSlashCommands.ts#messages:1">`
zh-Hans:
  newConversation: "新会话"
  startABlankConversationAndKeepThisOne: "开启空白对话，当前会话会留在历史里"
  compact: "压缩"
  summarizeThisConversationToFreeUpContextSpace: "把当前对话压成摘要，腾出上下文空间"
en:
  newConversation: "new"
  startABlankConversationAndKeepThisOne: "Start a blank conversation and keep this one in history"
  compact: "compact"
  summarizeThisConversationToFreeUpContextSpace: "Summarize this conversation to free up context space"
ja:
  newConversation: "新規会話"
  startABlankConversationAndKeepThisOne: "新しい会話を開始します。現在の会話は履歴に残ります"
  compact: "圧縮"
  summarizeThisConversationToFreeUpContextSpace: "この会話を要約して、コンテキストの空きを確保します"
`;
const t = createTranslator(messages);


export type ComposerSlashBuiltinId = "new" | "compact";

export interface ComposerSlashBuiltin {
  kind: "builtin";
  id: ComposerSlashBuiltinId;
  name: string;
  aliases: string[];
  description: string;
}

export type ComposerSlashItem =
  | ComposerSlashBuiltin
  | { kind: "skill"; skill: LocalSkill };

export const COMPOSER_SLASH_BUILTINS: readonly ComposerSlashBuiltin[] = [
  {
    kind: "builtin",
    id: "new",
    get name() { return t("newConversation"); },
    aliases: ["new", "新会话"],
    get description() { return t("startABlankConversationAndKeepThisOne"); },
  },
  {
    kind: "builtin",
    id: "compact",
    get name() { return t("compact"); },
    aliases: ["compact", "压缩"],
    get description() { return t("summarizeThisConversationToFreeUpContextSpace"); },
  },
];

function normalizeSlashQuery(value: string): string {
  return value.trim().toLowerCase();
}

function builtinMatchesQuery(
  command: ComposerSlashBuiltin,
  query: string,
): boolean {
  if (!query) return true;
  if (command.name.toLowerCase().includes(query)) return true;
  if (command.description.toLowerCase().includes(query)) return true;
  return command.aliases.some((alias) => alias.toLowerCase().includes(query));
}

export function searchComposerSlashItems(
  query: string,
  options?: { notebookId?: string; includeSkills?: boolean },
): ComposerSlashItem[] {
  const normalized = normalizeSlashQuery(query);
  const builtins = COMPOSER_SLASH_BUILTINS.filter((command) =>
    builtinMatchesQuery(command, normalized),
  );
  const skills = options?.includeSkills
    ? searchLocalSkills(query, options.notebookId).map(
        (skill): ComposerSlashItem => ({ kind: "skill", skill }),
      )
    : [];
  return [...builtins, ...skills];
}

export function slashItemKey(item: ComposerSlashItem): string {
  return item.kind === "builtin" ? `builtin:${item.id}` : item.skill.path;
}

export function slashItemTitle(item: ComposerSlashItem): string {
  return item.kind === "builtin" ? `/${item.name}` : item.skill.name;
}

export function slashItemDescription(item: ComposerSlashItem): string {
  return item.kind === "builtin" ? item.description : item.skill.description;
}

export function matchExactComposerSlashCommand(
  text: string,
): ComposerSlashBuiltinId | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return null;
  const body = trimmed.slice(1);
  const normalized = normalizeSlashQuery(body);
  if (!normalized || /[\s\n]/.test(body)) return null;
  for (const command of COMPOSER_SLASH_BUILTINS) {
    if (command.name.toLowerCase() === normalized) return command.id;
    if (command.aliases.some((alias) => alias.toLowerCase() === normalized)) {
      return command.id;
    }
  }
  return null;
}

export function matchComposerPayloadSlashCommand(
  payload: Pick<
    AiComposerPayload,
    "promptText" | "references" | "images" | "skills" | "selectionQuotes"
  >,
): ComposerSlashBuiltinId | null {
  if (
    payload.references.length > 0 ||
    payload.images.length > 0 ||
    payload.skills.length > 0 ||
    (payload.selectionQuotes?.length ?? 0) > 0
  ) {
    return null;
  }
  return matchExactComposerSlashCommand(payload.promptText);
}
