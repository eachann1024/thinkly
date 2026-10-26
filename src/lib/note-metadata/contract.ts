import type { NoteMeta } from "../export/markdown/noteMeta";

export type NoteSettings = {
  fontFamily: "default" | "serif" | "mono";
  pageLayout?: "standard" | "full";
  isLocked: boolean;
  isPinned: boolean;
  isFavorite: boolean;
};

export type NoteMetadataSnapshot = {
  digest: string;
  markdown: string;
  meta: NoteMeta | null;
  settings: NoteSettings;
};

export type NoteMetadataEnvelope = {
  version: 1;
  noteId: string;
  revision: string;
  relativePath?: string;
  deleted?: boolean;
  previousRelativePath?: string;
  recovery?: NoteMetadataSnapshot;
  recoveries?: NoteMetadataSnapshot[];
  current: NoteMetadataSnapshot;
  previous?: NoteMetadataSnapshot;
  legacyBaseline?: string;
};

export type PreparedNoteMetadata = {
  noteId: string;
  cleanMarkdown: string;
  frontmatter?: string;
  relativePath?: string;
  payload: NoteMetadataSnapshot;
};

export type HydratedNoteMetadata = {
  noteId?: string;
  legacyMarkdown: string;
  settings?: NoteSettings;
  revision: string | null;
  status: "legacy" | "ready";
};

export type NoteMetadataFs = Partial<Pick<GooseFs,
  "readFileAsync" | "readFileStatAsync" | "existsAsync" | "createFileAsync" |
  "writeFileAsync" | "readDir" | "readDirAsync" | "mkdir" | "rename" | "deleteFile" | "realpathAsync" | "compareAndSwapFileAsync"
>>;

export type NoteMetadataErrorCode = "identity" | "missing" | "corrupt" | "unsupported" |
  "mismatch" | "io-error" | "conflict" | "unsafe-path" | "too-large";

export class NoteMetadataError extends Error {
  readonly code: NoteMetadataErrorCode;
  readonly cause?: unknown;
  constructor(code: NoteMetadataErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "NoteMetadataError";
    this.code = code;
    this.cause = cause;
  }
}

export const MAX_MARKDOWN_CHARS = 16 * 1024 * 1024;
export const MAX_SIDECAR_CHARS = 40 * 1024 * 1024;
export const MAX_META_ENTRIES = 100_000;

export async function markdownDigest(markdown: string): Promise<string> {
  const bytes = new TextEncoder().encode(markdown);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("");
}
