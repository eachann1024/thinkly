import { markdownToJsonContent } from "@/lib/export/markdown/parse/block";
import { splitGeneratedMarkdown, type NoteMeta, type NoteNest } from "@/lib/export/markdown/noteMeta";

type ParsedBlock = {
  type?: string;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: ParsedBlock[];
};

function fingerprint(block: ParsedBlock): string {
  return JSON.stringify([block.type, block.props ?? {}, block.content ?? null]);
}

function buckets(values: string[]): Map<string, number[]> {
  const result = new Map<string, number[]>();
  values.forEach((value, index) => {
    const bucket = result.get(value) ?? [];
    bucket.push(index);
    result.set(value, bucket);
  });
  return result;
}

function context(values: string[], at: number): string {
  return JSON.stringify([values[at - 1] ?? null, values[at], values[at + 1] ?? null]);
}

function pathAt(parent: string, index: number): string {
  return parent ? `${parent}.${index}` : String(index);
}

function isEmpty(block: ParsedBlock): boolean {
  return block.type === "paragraph" && (!block.content ||
    Array.isArray(block.content) && block.content.length === 0);
}

function mapLevel(
  previous: ParsedBlock[], current: ParsedBlock[],
  previousParent: string, currentParent: string, paths: Map<string, string>,
): void {
  const oldKeys = previous.map(fingerprint);
  const newKeys = current.map(fingerprint);
  const oldBuckets = buckets(oldKeys);
  const newBuckets = buckets(newKeys);
  const oldContexts = buckets(oldKeys.map((_, at) => context(oldKeys, at)));
  const newContexts = buckets(newKeys.map((_, at) => context(newKeys, at)));
  previous.forEach((block, index) => {
    if (isEmpty(block)) return;
    const key = oldKeys[index];
    let candidates = newBuckets.get(key) ?? [];
    if (oldBuckets.get(key)?.length !== 1 || candidates.length !== 1) {
      const surrounding = context(oldKeys, index);
      candidates = oldContexts.get(surrounding)?.length === 1
        ? newContexts.get(surrounding) ?? [] : [];
    }
    if (candidates.length !== 1) return;
    const target = candidates[0];
    const oldPath = pathAt(previousParent, index);
    const newPath = pathAt(currentParent, target);
    paths.set(oldPath, newPath);
    mapLevel(block.children ?? [], current[target].children ?? [], oldPath, newPath, paths);
  });
}

function relocateNest(nest: NoteNest, paths: Map<string, string>): NoteNest | null {
  const parent = nest.path ? paths.get(nest.path) : "";
  if (parent === undefined) return null;
  const range: number[] = [];
  for (let offset = 0; offset <= nest.count; offset += 1) {
    const mapped = paths.get(pathAt(nest.path, nest.at + offset));
    if (mapped === undefined) return null;
    const separator = mapped.lastIndexOf(".");
    if (mapped.slice(0, separator < 0 ? 0 : separator) !== parent) return null;
    range.push(Number(mapped.slice(separator + 1)));
  }
  if (range.some((value, index) => value !== range[0] + index)) return null;
  return { path: parent, at: range[0], count: nest.count };
}

export function reanchorNoteMeta(
  previousMarkdown: string, markdown: string, meta: NoteMeta | null,
): NoteMeta | null {
  if (!meta) return null;
  if (previousMarkdown === markdown) return structuredClone(meta);
  try {
    const previous = markdownToJsonContent(splitGeneratedMarkdown(previousMarkdown).body) as ParsedBlock[];
    const current = markdownToJsonContent(splitGeneratedMarkdown(markdown).body) as ParsedBlock[];
    const paths = new Map<string, string>();
    mapLevel(previous, current, "", "", paths);
    const blocks: NonNullable<NoteMeta["blocks"]> = {};
    for (const [path, patch] of Object.entries(meta.blocks ?? {})) {
      const mapped = paths.get(path);
      if (mapped !== undefined) blocks[mapped] = structuredClone(patch);
    }
    const nests = (meta.nests ?? []).flatMap((nest) => {
      const mapped = relocateNest(nest, paths);
      return mapped ? [mapped] : [];
    });
    return Object.keys(blocks).length || nests.length
      ? { v: 1, ...(Object.keys(blocks).length ? { blocks } : {}), ...(nests.length ? { nests } : {}) }
      : null;
  } catch {
    return null;
  }
}
