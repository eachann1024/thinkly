
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/lib/notebook-ai/localSkillParsing.ts#messages:1">`
zh-Hans:
  localSkill: "本地 Skill"
en:
  localSkill: "Local skill"
`;
const t = createTranslator(messages);
const MAX_LOCAL_SKILL_CHARACTERS = 32_000;

export interface LocalSkill {
  name: string;
  description: string;
  path: string;
  content: string;
}

/** 工作区 Skill：在 SKILL/ 或 skills/ 下的 SKILL.md，或直接挂在该目录的 md */
const WORKSPACE_SKILL_DIR = /(?:^|\/)(?:SKILL|skills)\//i;
const WORKSPACE_SKILL_FILE = /\/SKILL\.md$/i;
const WORKSPACE_FLAT_SKILL_FILE = /(?:^|\/)(?:SKILL|skills)\/[^/]+\.md$/i;

function frontmatterValue(content: string, key: string) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return "";
  const line = match[1]
    .split("\n")
    .find((item) => item.trimStart().startsWith(`${key}:`));
  return (
    line
      ?.slice(line.indexOf(":") + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "") ?? ""
  );
}

function fallbackSkillName(path: string) {
  const parts = path.replace(/\\/g, "/").split("/");
  const file = parts.at(-1) ?? "skill";
  if (/^SKILL\.md$/i.test(file)) {
    return parts.at(-2) ?? "skill";
  }
  return file.replace(/\.md$/i, "");
}

export function normalizeSkillName(name: string) {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
  return /^[a-z0-9][a-z0-9-]*$/.test(normalized) ? normalized : "";
}

export function isWorkspaceSkillFilePath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  if (!WORKSPACE_SKILL_DIR.test(normalized) || !/\.md$/i.test(normalized)) {
    return false;
  }
  return (
    WORKSPACE_SKILL_FILE.test(normalized) ||
    WORKSPACE_FLAT_SKILL_FILE.test(normalized)
  );
}

export function skillFromFile(
  path: string,
  content: string,
): LocalSkill | null {
  const name = normalizeSkillName(
    frontmatterValue(content, "name") || fallbackSkillName(path),
  );
  if (!name) return null;
  return {
    name,
    description: frontmatterValue(content, "description") || t("localSkill"),
    path,
    content: content.trim().slice(0, MAX_LOCAL_SKILL_CHARACTERS),
  };
}
