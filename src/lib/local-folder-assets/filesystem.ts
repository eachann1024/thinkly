import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/local-folder-assets/filesystem.ts#localMessages:1">`
zh-Hans:
  readDirectoryFailed: "无法读取目录：{{path}}"
  readMarkdownFailed: "无法读取 Markdown：{{path}}"
  directoryCycle: "目录循环：{{path}}"
  pathOutsideNotebook: "扫描路径超出笔记本：{{path}}"
en:
  readDirectoryFailed: "Couldn’t read folder: {{path}}"
  readMarkdownFailed: "Couldn’t read Markdown: {{path}}"
  directoryCycle: "Folder cycle detected: {{path}}"
  pathOutsideNotebook: "Scan path is outside the notebook: {{path}}"
`;
const uiText = createTranslator(localMessages);
import { originalHistoryPath } from "../history/localPaths";
import type { JSONContent } from "@/types";
import { getLocalMdSnapshot } from "../local-md-snapshot";
import type {
  LocalFolderEntry,
  AssetMaintenanceFs,
  ScanUnreferencedLocalAssetsOptions,
} from "./types";
import {
  normalizePath,
  dirname,
  getLocalAssetKind,
  createReferenceIndex,
  collectReferencesFromJson,
  extractAssetReferencesFromMarkdown,
  type LocalAssetReferenceIndex,
} from "./references";

async function readDirectory(
  gooseFs: AssetMaintenanceFs,
  path: string,
): Promise<LocalFolderEntry[]> {
  const entries = gooseFs.readDirAsync
    ? await gooseFs.readDirAsync(path)
    : gooseFs.readDir(path);
  if (!Array.isArray(entries)) throw new Error(uiText("readDirectoryFailed", {path}));
  return entries;
}

export async function pathExists(
  gooseFs: AssetMaintenanceFs,
  path: string,
): Promise<boolean> {
  if (gooseFs.existsAsync) return Boolean(await gooseFs.existsAsync(path));
  return Boolean(gooseFs.exists(path));
}

async function readTextFile(
  gooseFs: AssetMaintenanceFs,
  filePath: string,
): Promise<string | null> {
  const text = gooseFs.readFileAsync
    ? await gooseFs.readFileAsync(filePath)
    : gooseFs.readFile(filePath);
  if (typeof text !== "string")
    throw new Error(uiText("readMarkdownFailed", {path: filePath}));
  return text;
}

function isWithin(basePath: string, target: string): boolean {
  return normalizePath(target).startsWith(
    `${normalizePath(basePath).replace(/\/$/, "")}/`,
  );
}

// 包含隐藏目录以及 assets 中的 Markdown；不读取 JS/CSS 等其它文件内容。
export async function collectNotebookFiles(
  gooseFs: AssetMaintenanceFs,
  basePath: string,
) {
  const markdown: string[] = [];
  const assets: LocalFolderEntry[] = [];
  const history: string[] = [];
  const seen = new Set<string>();
  const walk = async (directory: string) => {
    if (seen.has(directory)) throw new Error(uiText("directoryCycle", {path: directory}));
    seen.add(directory);
    const entries = await readDirectory(gooseFs, directory);
    for (const entry of entries) {
      if (
        !isWithin(basePath, entry.path) ||
        dirname(entry.path) !== normalizePath(directory)
      ) {
        throw new Error(uiText("pathOutsideNotebook", {path: entry.path}));
      }
      if (entry.isDirectory) await walk(entry.path);
      if (!entry.isFile) continue;
      if (/\.(md|markdown)$/i.test(entry.name)) markdown.push(entry.path);
      if (/\.json$/i.test(entry.name) && relativePath(basePath, entry.path).startsWith(".goose/history/")) history.push(entry.path);
      if (
        getLocalAssetKind(entry.name) &&
        /(?:^|\/)assets\//i.test(relativePath(basePath, entry.path))
      ) {
        assets.push(entry);
      }
    }
  };
  await walk(normalizePath(basePath));
  return { markdown, assets, history };
}

export function relativePath(basePath: string, targetPath: string): string {
  const base = normalizePath(basePath).replace(/\/$/, "");
  const target = normalizePath(targetPath);
  return target.startsWith(`${base}/`) ? target.slice(base.length + 1) : target;
}

export function getFileSize(
  gooseFs: AssetMaintenanceFs,
  entry: LocalFolderEntry,
): number {
  if (typeof entry.size === "number") return entry.size;
  const base64 = gooseFs.readFileBase64?.(entry.path);
  if (!base64) return 0;
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

export async function collectReferenceIndex(
  { basePath, pages, gooseFs }: ScanUnreferencedLocalAssetsOptions,
  diskMarkdown?: string[],
): Promise<LocalAssetReferenceIndex> {
  const normalizedBasePath = normalizePath(basePath);
  const index = createReferenceIndex();
  const seenMarkdown = new Set<string>();

  const ingestMarkdown = async (
    filePath: string,
    fallbackContent?: unknown,
  ) => {
    if (!filePath || !isWithin(normalizedBasePath, filePath)) return;
    const key = normalizePath(filePath);
    if (!seenMarkdown.has(key)) {
      seenMarkdown.add(key);
      const markdown = await readTextFile(gooseFs, filePath);
      if (typeof markdown === "string") {
        extractAssetReferencesFromMarkdown(
          markdown,
          filePath,
          normalizedBasePath,
          index,
        );
      }
    }
    if (fallbackContent !== undefined) {
      collectReferencesFromJson(
        fallbackContent,
        filePath,
        normalizedBasePath,
        index,
        new WeakSet(),
      );
    }
  };

  for (const page of pages) {
    if (page.isFolder || !page.localFilePath) continue;
    if (!isWithin(normalizedBasePath, page.localFilePath)) continue;
    collectReferencesFromJson(
      page.content as JSONContent,
      page.localFilePath,
      normalizedBasePath,
      index,
      new WeakSet(),
    );
    const snapshot = getLocalMdSnapshot(page.localFilePath);
    if (snapshot !== undefined)
      extractAssetReferencesFromMarkdown(
        snapshot,
        page.localFilePath,
        normalizedBasePath,
        index,
      );
  }

  for (const filePath of diskMarkdown ??
    (await collectNotebookFiles(gooseFs, normalizedBasePath)).markdown) {
    await ingestMarkdown(filePath);
  }

  // Historical snapshots also keep resources alive, including deleted notes.
  for (const file of (await collectNotebookFiles(gooseFs, normalizedBasePath)).history) {
    const text = await readTextFile(gooseFs, file);
    const version = JSON.parse(text!);
    if (!version.content) continue;
    const mirror = relativePath(basePath, file).slice(".goose/history/".length).split("/").slice(0, -1).join("/");
    const relative = version.relativePath || mirror || originalHistoryPath(version.pageId, version.workspaceId);
    const notePath = relative ? `${normalizedBasePath}/${relative}` : `${normalizedBasePath}/history.md`;
    collectReferencesFromJson(version.content, notePath, normalizedBasePath, index, new WeakSet());
  }
  return index;
}
