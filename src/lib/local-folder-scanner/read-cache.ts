import {
  getLocalMdSnapshot,
  isStatMatchingSnapshot,
} from "@/lib/local-md-snapshot";
import { readMarkdownFile, statMarkdownFile } from "./entries";

export type MarkdownRead = Awaited<ReturnType<typeof readMarkdownFile>>;
const inFlight = new WeakMap<GooseFs, Map<string, Promise<MarkdownRead>>>();
const handoffs = new Map<string, MarkdownRead>();

/** Only concurrent reads are shared; completed results are never a disk truth cache. */
export function readSharedMarkdown(
  fs: GooseFs,
  path: string,
): Promise<MarkdownRead> {
  let reads = inFlight.get(fs);
  if (!reads) {
    reads = new Map();
    inFlight.set(fs, reads);
  }
  const pending = reads.get(path);
  if (pending) return pending;
  const request = readMarkdownFile(fs, path).finally(() => reads!.delete(path));
  reads.set(path, request);
  return request;
}

export async function readUnchangedMarkdown(
  fs: GooseFs,
  path: string,
): Promise<MarkdownRead> {
  const stat = await statMarkdownFile(fs, path);
  const content = getLocalMdSnapshot(path);
  if (stat && content !== undefined && isStatMatchingSnapshot(path, stat)) {
    return { content, stat };
  }
  return readSharedMarkdown(fs, path);
}

/** Available only while the caller synchronously invokes reload, never after a toast. */
export function withMarkdownReadHandoff(
  path: string,
  read: MarkdownRead,
  reload: () => void,
): void {
  handoffs.set(path, read);
  try {
    reload();
  } finally {
    handoffs.delete(path);
  }
}

export function takeMarkdownReadHandoff(
  path: string,
): MarkdownRead | undefined {
  const read = handoffs.get(path);
  handoffs.delete(path);
  return read;
}

export async function validateMarkdownRead(
  fs: GooseFs,
  path: string,
  read: MarkdownRead,
  requireOldFingerprint = true,
): Promise<boolean> {
  if (
    !read.stat ||
    (requireOldFingerprint && Date.now() - read.stat.mtimeMs <= 2500)
  )
    return false;
  const current = await statMarkdownFile(fs, path);
  return Boolean(
    current &&
    current.mtimeMs === read.stat.mtimeMs &&
    current.size === read.stat.size,
  );
}
