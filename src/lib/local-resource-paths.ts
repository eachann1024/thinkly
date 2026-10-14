import MarkdownIt from "markdown-it";
import { normalizePath, dirname, isAbsolutePath, cleanAssetDestination, isAssetPath, getLocalAssetKind } from "./local-folder-assets/references";

function localResource(value: string): boolean {
  return !/^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(value) && (isAssetPath(value) || getLocalAssetKind(cleanAssetDestination(value)) !== null || /\.(?:pdf|zip|docx?|xlsx?|pptx?|txt|mp3|wav|ogg|m4a)$/i.test(cleanAssetDestination(value)));
}

function relativeTo(directory: string, target: string): string {
  const from = normalizePath(directory).split("/"), to = normalizePath(target).split("/");
  let same = 0;
  while (same < from.length && same < to.length && from[same] === to[same]) same++;
  const result = [...from.slice(same).map(() => ".."), ...to.slice(same)].join("/");
  return result.startsWith("..") ? result : `./${result}`;
}

export function rebaseLocalResource(value: string, fromFile: string, toFile: string): string {
  if (!localResource(value) || isAbsolutePath(value)) return value;
  const clean = cleanAssetDestination(value);
  const target = normalizePath(`${dirname(fromFile)}/${clean}`);
  const suffix = value.match(/[?#].*$/)?.[0] ?? "";
  const relative = relativeTo(dirname(toFile), target);
  return (/%[0-9a-f]{2}/i.test(value) ? relative.split("/").map(encodeURIComponent).join("/") : relative) + suffix;
}

/** Change only resource destinations; preserve prose, frontmatter and formatting. */
export function rebaseMarkdownResources(markdown: string, fromFile: string, toFile: string): string {
  const rebase = (value: string) => rebaseLocalResource(value, fromFile, toFile);
  const rewrite = (text: string) => text
    .replace(/(!?\[[^\]\n]*\]\(\s*)(<[^>\n]+>|[^)\s]+)([^\n]*?\))/g, (_all, start: string, url: string, end: string) => `${start}${url.startsWith("<") ? `<${rebase(url.slice(1, -1))}>` : rebase(url)}${end}`)
    .replace(/(\b(?:src|href)\s*=\s*["'])([^"']+)(["'])/gi, (_all, start: string, url: string, end: string) => `${start}${rebase(url)}${end}`)
    .replace(/(^ {0,3}\[[^\]\n]+\]:\s*)(<[^>\n]+>|\S+)/gm, (_all, start: string, url: string) => `${start}${url.startsWith("<") ? `<${rebase(url.slice(1, -1))}>` : rebase(url)}`)
    .replace(/(!\[\[)([^\]|#\n]+)([^\]\n]*\]\])/g, (_all, start: string, url: string, end: string) => `${start}${rebase(url)}${end}`);
  const lines = markdown.split(/(?<=\n)/);
  const protectedLines = new Set<number>();
  for (const token of new MarkdownIt({ html: true }).parse(markdown, {})) {
    if ((token.type === "fence" || token.type === "code_block") && token.map) for (let i = token.map[0]; i < token.map[1]; i++) protectedLines.add(i);
  }
  return lines.map((line, i) => protectedLines.has(i) ? line : line.split(/(`+[^`\n]*`+)/).map((part) => part.startsWith("`") ? part : rewrite(part)).join("")).join("");

}

export async function rebaseHistoricalResources<T>(content: T, fromFile: string, toFile: string, exists: (path: string) => boolean | Promise<boolean>): Promise<T> {
  async function walk(value: unknown, key?: string): Promise<unknown> {
    if (typeof value === "string" && ["url", "src", "href"].includes(key ?? "") && localResource(value)) {
      const target = normalizePath(`${dirname(fromFile)}/${cleanAssetDestination(value)}`);
      return await exists(target) ? rebaseLocalResource(value, fromFile, toFile) : value;
    }
    if (Array.isArray(value)) return Promise.all(value.map((item) => walk(item)));
    if (value && typeof value === "object") return Object.fromEntries(await Promise.all(Object.entries(value).map(async ([name, entry]) => [name, await walk(entry, name)])));
    return value;
  }
  return await walk(content) as T;
}

export function rebaseResourceContent<T>(content: T, fromFile: string, toFile: string): T {
  function walk(value: unknown, key?: string): unknown {
    if (typeof value === "string" && ["url", "src", "href"].includes(key ?? "")) return rebaseLocalResource(value, fromFile, toFile);
    if (Array.isArray(value)) return value.map((entry) => walk(entry));
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([name, entry]) => [name, walk(entry, name)]));
    return value;
  }
  return walk(content) as T;
}
