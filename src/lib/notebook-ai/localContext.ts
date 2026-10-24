import { getContentDerivationsForPage } from "@/components/editor/utils/content-page-derivations-cache";
import { getLocalMdSnapshot } from "@/lib/local-md-snapshot";
import type { Page } from "@/types";

import {
  normalizeSkillName,
  skillFromFile,
  isWorkspaceSkillFilePath,
} from "./localSkillParsing";
import {
  getCachedSkillDirectory,
  clearSkillDirectoryCache,
  warmSkillDirectoryCache,
} from "./localSkillDirectory";
import type { LocalSkill } from "./localSkillParsing";

const MAX_GLOBAL_PROMPT_CHARACTERS = 24_000;

export type { LocalSkill } from "./localSkillParsing";
export { isWorkspaceSkillFilePath } from "./localSkillParsing";
export const clearLocalSkillsCache = clearSkillDirectoryCache;
export const warmLocalSkillsCache = warmSkillDirectoryCache;

function readWorkspaceSkillContent(page: Page): string {
  if (page.localFilePath) {
    const snapshot = getLocalMdSnapshot(page.localFilePath);
    if (snapshot) return snapshot;
  }
  return getContentDerivationsForPage(page).text;
}

export function collectWorkspaceSkillsFromPages(
  pages: Page[],
  notebookId: string,
  readContent: (page: Page) => string = readWorkspaceSkillContent,
): LocalSkill[] {
  const seenNames = new Set<string>();
  const skills: LocalSkill[] = [];
  for (const page of pages) {
    const wsId =
      page.workspaceId ?? (page as { notebookId?: string }).notebookId;
    if (
      wsId !== notebookId ||
      page.trashedAt ||
      page.isFolder ||
      !page.localFilePath ||
      !isWorkspaceSkillFilePath(page.localFilePath)
    ) {
      continue;
    }
    const skill = skillFromFile(page.localFilePath, readContent(page));
    if (!skill || seenNames.has(skill.name)) continue;
    seenNames.add(skill.name);
    skills.push(skill);
  }
  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

export const getLocalSkills = getCachedSkillDirectory;

export function searchLocalSkills(query: string, notebookId?: string) {
  const normalized = query.trim().toLowerCase();
  return getLocalSkills(notebookId)
    .filter(
      (skill) =>
        !normalized ||
        skill.name.toLowerCase().includes(normalized) ||
        skill.description.toLowerCase().includes(normalized),
    )
    .slice(0, 30);
}

export function resolveInvokedLocalSkill(
  promptText: string,
): LocalSkill | null {
  if (!promptText) return null;
  const skills = getLocalSkills();
  if (!skills.length) return null;
  const byName = new Map(skills.map((skill) => [skill.name, skill]));
  const re = /\/([a-z0-9][a-z0-9-]*)\b/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(promptText)) !== null) {
    const skill = byName.get(match[1].toLowerCase());
    if (skill) return skill;
  }
  return null;
}

export function resolveInvokedLocalSkillFromTokens(
  tokens: Array<{ type: string; skill?: { name: string }; text?: string }>,
): LocalSkill | null {
  for (const token of tokens) {
    if (token.type !== "skill" || !token.skill?.name) continue;
    const name =
      normalizeSkillName(token.skill.name) || token.skill.name.toLowerCase();
    return getLocalSkills().find((skill) => skill.name === name) ?? null;
  }

  const text = tokens
    .map((token) => {
      if (token.type === "text") return token.text ?? "";
      if (token.type === "skill" && token.skill?.name) {
        return `/${token.skill.name}`;
      }
      return "";
    })
    .join("");
  return resolveInvokedLocalSkill(text);
}

export function readGlobalAgentsPrompt() {
  return (
    window.gooseAiContext
      ?.readGlobalPrompt?.()
      ?.trim()
      .slice(0, MAX_GLOBAL_PROMPT_CHARACTERS) ?? ""
  );
}
