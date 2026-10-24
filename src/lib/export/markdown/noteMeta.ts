import { stringify as stringifyYaml } from "yaml";
import { isGeneratedDataImageName } from "@/components/editor/blocks/image/imageCaption";
import { normalizeCalloutIcon, resolveCalloutIcon } from "@/components/editor/blocks/callout/calloutIcons";
import { parseLocalFrontmatterBlob } from "@/lib/local-frontmatter";
import { detachBlockPropsMarker } from "./blockPropsMarker";
import { pickPersistedBlockProps } from "./blockPropsProperties";
import { imageAltText } from "./serialize/image";

/** 写在正文外的应用设置。goose- 键不进编辑器。 */
export const NOTE_META_KEY = "goose-note";

export type NoteColumn = { path: string; at: number; widths: string; counts: number[] };
export type NoteNest = { path: string; at: number; count: number };
export type NoteMeta = {
  v: 1;
  blocks?: Record<string, Record<string, unknown>>;
  columns?: NoteColumn[];
  nests?: NoteNest[];
};

export type NoteSink = {
  patch: (path: string, value: Record<string, unknown>) => void;
  column: (entry: NoteColumn) => void;
  nest: (entry: NoteNest) => void;
  finish: () => NoteMeta | null;
};

export function createNoteSink(): NoteSink {
  const meta: NoteMeta = { v: 1 };
  return {
    patch(path, value) {
      meta.blocks ??= {};
      meta.blocks[path] = { ...(meta.blocks[path] ?? {}), ...value };
    },
    column(entry) { (meta.columns ??= []).push(entry); },
    nest(entry) { (meta.nests ??= []).push(entry); },
    finish() {
      return meta.blocks || meta.columns || meta.nests ? meta : null;
    },
  };
}

export class MarkdownScope {
  index = 0;
  readonly path: string;
  readonly sink: NoteSink;
  constructor(path: string, sink: NoteSink) {
    this.path = path;
    this.sink = sink;
  }
  take(block: any): { path: string; block: any } {
    const at = this.index++;
    const path = this.path ? `${this.path}.${at}` : String(at);
    return { path, block: rememberBlock(block, path, this.sink) };
  }
  child(path: string): MarkdownScope {
    return new MarkdownScope(path, this.sink);
  }
}

function rememberBlock(block: any, path: string, sink: NoteSink): any {
  const prepared = detachBlockPropsMarker(block);
  const patch: Record<string, unknown> = {};
  const props = pickPersistedBlockProps(prepared.props);
  if (Object.keys(props).length) patch.props = props;
  const icon = prepared.props?.icon;
  if (prepared.type === "callout" && typeof icon === "string" && icon) {
    const emoji = resolveCalloutIcon(icon);
    if (normalizeCalloutIcon(emoji) !== normalizeCalloutIcon(icon)) patch.calloutIcon = icon;
  }
  if (prepared.props?.sequenceColumn === true) patch.sequence = true;
  if (prepared.type === "codeBlock") {
    const code: Record<string, unknown> = {};
    if (typeof prepared.props?.summary === "string" && prepared.props.summary.trim()) code.summary = prepared.props.summary;
    if (prepared.props?.collapsed === true) code.collapsed = true;
    if (prepared.props?.wrap === true) code.wrap = true;
    if (Object.keys(code).length) patch.code = code;
  }
  const image = imagePatch(prepared);
  if (image) patch.image = image;
  const file = filePatch(prepared);
  if (file) patch.file = file;
  const media = mediaPatch(prepared);
  if (media) patch.media = media;
  if (Object.keys(patch).length) sink.patch(path, patch);
  return prepared;
}

function imagePatch(block: any): Record<string, unknown> | null {
  if (block?.type !== "image" && block?.type !== "imageResize") return null;
  const props = block.props ?? block.attrs ?? {};
  const alt = imageAltText(props);
  const plainCaption = alt && !isGeneratedDataImageName(alt) ? alt : "";
  const extra: Record<string, unknown> = {};
  if (String(props.name ?? "") !== alt) extra.name = String(props.name ?? "");
  if (String(props.caption ?? "") !== plainCaption) extra.caption = String(props.caption ?? "");
  if (typeof props.alt === "string" && props.alt !== alt) extra.alt = props.alt;
  const width = Number(props.previewWidth ?? props.width);
  if (Number.isFinite(width) && width > 0) extra.previewWidth = width;
  if (props.textAlignment && props.textAlignment !== "left") extra.textAlignment = props.textAlignment;
  if (props.backgroundColor && props.backgroundColor !== "default") extra.backgroundColor = props.backgroundColor;
  if (props.showPreview === false) extra.showPreview = false;
  if (props.captionSource === "user" || props.captionSource === "generated") extra.captionSource = props.captionSource;
  if (block.type === "imageResize") extra.legacyResize = true;
  return Object.keys(extra).length ? extra : null;
}

function filePatch(block: any): Record<string, unknown> | null {
  if (block?.type !== "file") return null;
  const props = block.props ?? {};
  const extra: Record<string, unknown> = {};
  if (props.caption) extra.caption = props.caption;
  if (props.backgroundColor && props.backgroundColor !== "default") extra.backgroundColor = props.backgroundColor;
  return Object.keys(extra).length ? extra : null;
}

function mediaPatch(block: any): Record<string, unknown> | null {
  if (block?.type !== "audio" && block?.type !== "video") return null;
  const props = block.props ?? {};
  const extra: Record<string, unknown> = {};
  if (props.name) extra.name = props.name;
  if (props.caption) extra.caption = props.caption;
  if (props.backgroundColor && props.backgroundColor !== "default") extra.backgroundColor = props.backgroundColor;
  if (props.showPreview === false) extra.showPreview = false;
  if (block.type === "video" && props.textAlignment && props.textAlignment !== "left") extra.textAlignment = props.textAlignment;
  const width = Number(props.previewWidth);
  if (block.type === "video" && Number.isFinite(width) && width > 0) extra.previewWidth = width;
  return Object.keys(extra).length ? extra : null;
}

function renderFrontmatter(data: Record<string, unknown>): string {
  const yaml = stringifyYaml(data, { lineWidth: 0 }).replace(/\s+$/, "");
  return yaml ? `---\n${yaml}\n---` : "---\n---";
}

/** 只剥掉文件头后的一个分隔空行，正文自己的空行留下来。 */
function peelFrontmatter(markdown: string): { frontmatter: string | null; body: string } {
  const normalized = markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  if (lines[0]?.trim() !== "---") return { frontmatter: null, body: normalized };
  let end = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === "---") {
      end = index;
      break;
    }
  }
  if (end === -1) return { frontmatter: null, body: normalized };
  const rest = lines.slice(end + 1);
  if (rest[0] === "") rest.shift();
  return { frontmatter: lines.slice(0, end + 1).join("\n"), body: rest.join("\n") };
}

function joinFrontmatter(frontmatter: string, body: string): string {
  return body ? `${frontmatter}\n\n${body}` : `${frontmatter}\n`;
}

function parseMeta(value: unknown): NoteMeta | null {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== "object" || (parsed as { v?: unknown }).v !== 1) return null;
    return parsed as NoteMeta;
  } catch {
    return null;
  }
}

export function attachNoteMeta(body: string, meta: NoteMeta | null): string {
  if (!meta) return body;
  const payload = JSON.stringify(meta);
  const existing = peelFrontmatter(body);
  if (existing.frontmatter) {
    const parsed = parseLocalFrontmatterBlob(existing.frontmatter);
    if (parsed.ok) {
      return joinFrontmatter(renderFrontmatter({ ...parsed.data, [NOTE_META_KEY]: payload }), existing.body);
    }
  }
  return joinFrontmatter(renderFrontmatter({ [NOTE_META_KEY]: payload }), body);
}

export function splitGeneratedMarkdown(markdown: string): { body: string; meta: NoteMeta | null } {
  const extracted = peelFrontmatter(markdown);
  if (!extracted.frontmatter) return { body: markdown, meta: null };
  const parsed = parseLocalFrontmatterBlob(extracted.frontmatter);
  if (!parsed.ok || !Object.prototype.hasOwnProperty.call(parsed.data, NOTE_META_KEY)) {
    return { body: markdown, meta: null };
  }
  const meta = parseMeta(parsed.data[NOTE_META_KEY]);
  if (!meta) return { body: markdown, meta: null };
  const rest = { ...parsed.data };
  delete rest[NOTE_META_KEY];
  if (Object.keys(rest).length === 0) return { body: extracted.body, meta };
  return { body: joinFrontmatter(renderFrontmatter(rest), extracted.body), meta };
}

/** 这次保存没有新的应用设置时，去掉 frontmatter 里残留的旧 goose-note。 */
export function stripNoteMetaBlob(blob: string | null | undefined): string | undefined {
  if (!blob) return undefined;
  const parsed = parseLocalFrontmatterBlob(blob);
  if (!parsed.ok || !Object.prototype.hasOwnProperty.call(parsed.data, NOTE_META_KEY)) return blob;
  const rest = { ...parsed.data };
  delete rest[NOTE_META_KEY];
  return Object.keys(rest).length ? renderFrontmatter(rest) : undefined;
}

function applyPatch(props: Record<string, unknown>, patch: Record<string, unknown>) {
  const next = { ...props };
  for (const key of ["props", "image", "file", "media", "code"] as const) {
    const value = patch[key];
    if (value && typeof value === "object") Object.assign(next, value);
  }
  if (typeof patch.calloutIcon === "string") next.icon = patch.calloutIcon;
  if (patch.sequence === true) next.sequenceColumn = true;
  delete next.legacyResize;
  return next;
}

function foldLevel(blocks: any[], parentPath: string, meta: NoteMeta): any[] {
  const next = blocks.map((block) => ({ ...block }));
  const consumed = new Set<number>();
  for (const nest of (meta.nests ?? []).filter((entry) => entry.path === parentPath).sort((a, b) => b.at - a.at)) {
    const parent = next[nest.at];
    if (!parent) continue;
    const kids = [];
    for (let offset = 1; offset <= nest.count; offset += 1) {
      const index = nest.at + offset;
      if (!next[index]) continue;
      kids.push(next[index]);
      consumed.add(index);
    }
    next[nest.at] = { ...parent, children: [...(parent.children ?? []), ...kids] };
  }
  for (const column of (meta.columns ?? []).filter((entry) => entry.path === parentPath)) {
    if (!next[column.at]) continue;
    let cursor = column.at;
    const sections = column.counts.map((count) => {
      const children = [];
      for (let offset = 0; offset < count; offset += 1) {
        const index = cursor + offset;
        if (!consumed.has(index) && next[index]) children.push(next[index]);
        consumed.add(index);
      }
      cursor += count;
      return { type: "columnSection", children };
    });
    consumed.delete(column.at);
    next[column.at] = { type: "columnLayout", props: { widths: column.widths }, children: sections };
  }
  return next.filter((_, index) => !consumed.has(index));
}

export function applyNoteMeta(blocks: any[], meta: NoteMeta | null): any[] {
  if (!meta) return blocks;
  const visit = (list: any[], parentPath: string): any[] => {
    const patched = list.map((block, index) => {
      const path = parentPath ? `${parentPath}.${index}` : String(index);
      const children = Array.isArray(block?.children) ? visit(block.children, path) : block?.children;
      const patch = meta.blocks?.[path];
      return {
        ...block,
        ...(children ? { children } : {}),
        ...(patch ? { props: applyPatch(block?.props ?? {}, patch) } : {}),
      };
    });
    return foldLevel(patched, parentPath, meta);
  };
  return visit(blocks, "");
}
