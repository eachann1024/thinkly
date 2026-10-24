import { getContentDerivationsForPage } from "@/components/editor/utils/content-page-derivations-cache";
import { getLocalMdSnapshot } from "@/lib/local-md-snapshot";
import { useNotebooks } from "@/stores/useNotebooks";
import { usePages } from "@/stores/usePages";
import type { Page } from "@/types";
import {
  isWorkspaceSkillFilePath,
  skillFromFile,
  type LocalSkill,
} from "./localSkillParsing";

const TTL = 60_000;
const MAX_DIRECTORIES = 8;
const EMPTY: LocalSkill[] = [];
type ParsedPage = {
  id: string;
  path: string;
  updatedAt: number;
  content: Page["content"];
  snapshot: string | undefined;
  skill: LocalSkill | null;
};
type Directory = {
  root: string | undefined;
  pages: ParsedPage[];
  skills: LocalSkill[];
  global?: LocalSkill[];
  merged?: LocalSkill[];
};
const directories = new Map<string, Directory>();
let candidatePages = new WeakMap<Record<string, Page>, Page[]>();

function getCandidatePages(): Page[] {
  const source = usePages.getState().pages;
  const cached = candidatePages.get(source);
  if (cached) return cached;
  const candidates = Object.values(source).filter(
    (page) =>
      !page.trashedAt &&
      !page.isFolder &&
      page.localFilePath &&
      isWorkspaceSkillFilePath(page.localFilePath),
  );
  candidatePages.set(source, candidates);
  return candidates;
}
let globalCache:
  | { skills: LocalSkill[]; loadedAt: number; bridge: Window["gooseAiContext"] }
  | undefined;

export function clearSkillDirectoryCache() {
  globalCache = undefined;
  directories.clear();
  candidatePages = new WeakMap();
  emptyDirectory.global = undefined;
  emptyDirectory.merged = undefined;
}

function loadGlobalSkills(forceRefresh: boolean): LocalSkill[] {
  const bridge = window.gooseAiContext;
  if (
    !forceRefresh &&
    globalCache &&
    globalCache.bridge === bridge &&
    Date.now() - globalCache.loadedAt < TTL
  ) {
    return globalCache.skills;
  }
  if (!bridge?.listLocalSkills) return EMPTY;
  try {
    const skills = bridge
      .listLocalSkills()
      .map(({ path, content }) => skillFromFile(path, content))
      .filter((skill): skill is LocalSkill => skill !== null);
    globalCache = { skills, loadedAt: Date.now(), bridge };
    return skills;
  } catch {
    return globalCache?.bridge === bridge ? globalCache.skills : EMPTY;
  }
}

export function warmSkillDirectoryCache() {
  getCachedSkillDirectory();
}

function getWorkspaceDirectory(
  targetId: string,
  root: string | undefined,
  forceRefresh: boolean,
): Directory {
  const previous = directories.get(targetId);
  const reusable =
    !forceRefresh && previous?.root === root ? previous : undefined;
  const oldPages = new Map(reusable?.pages.map((page) => [page.id, page]));
  const pages: ParsedPage[] = [];
  for (const page of getCandidatePages()) {
    const workspaceId =
      page.workspaceId ?? (page as { notebookId?: string }).notebookId;
    if (
      workspaceId !== targetId ||
      page.trashedAt ||
      page.isFolder ||
      !page.localFilePath ||
      !isWorkspaceSkillFilePath(page.localFilePath)
    )
      continue;
    const snapshot = getLocalMdSnapshot(page.localFilePath);
    const old = oldPages.get(page.id);
    if (
      old &&
      old.path === page.localFilePath &&
      old.updatedAt === page.updatedAt &&
      old.content === page.content &&
      old.snapshot === snapshot
    ) {
      pages.push(old);
    } else {
      const content = snapshot || getContentDerivationsForPage(page).text;
      pages.push({
        id: page.id,
        path: page.localFilePath,
        updatedAt: page.updatedAt,
        content: page.content,
        snapshot,
        skill: skillFromFile(page.localFilePath, content),
      });
    }
  }
  const unchanged =
    reusable &&
    pages.length === reusable.pages.length &&
    pages.every((page, index) => page === reusable.pages[index]);
  if (unchanged) return reusable;
  const seen = new Set<string>();
  const skills = pages
    .flatMap(({ skill }) => {
      if (!skill || seen.has(skill.name)) return [];
      seen.add(skill.name);
      return [skill];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  const directory: Directory = { root, pages, skills };
  directories.delete(targetId);
  directories.set(targetId, directory);
  while (directories.size > MAX_DIRECTORIES)
    directories.delete(directories.keys().next().value!);
  return directory;
}

const emptyDirectory: Directory = { root: undefined, pages: [], skills: EMPTY };

export function getCachedSkillDirectory(
  notebookId?: string,
  forceRefresh = false,
): LocalSkill[] {
  const state = useNotebooks.getState();
  for (const id of directories.keys()) {
    if (!state.notebooks[id] || state.notebooks[id].source !== "local-folder")
      directories.delete(id);
  }
  const targetId = notebookId ?? state.activeNotebookId;
  const notebook = targetId ? state.notebooks[targetId] : undefined;
  const directory =
    targetId && notebook?.source === "local-folder"
      ? getWorkspaceDirectory(targetId, notebook.localPath, forceRefresh)
      : emptyDirectory;
  const global = loadGlobalSkills(forceRefresh);
  if (directory.global === global && directory.merged) return directory.merged;
  const seen = new Set<string>();
  directory.merged = [...directory.skills, ...global]
    .filter((skill) => {
      if (seen.has(skill.name)) return false;
      seen.add(skill.name);
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  directory.global = global;
  return directory.merged;
}
