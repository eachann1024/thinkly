import {
  getLocalMdSnapshot,
  isStatMatchingSnapshot,
} from "@/lib/local-md-snapshot";
import { readMarkdownFile, statMarkdownFile } from "./entries";

export type MarkdownRead = Awaited<ReturnType<typeof readMarkdownFile>>;
const inFlight = new WeakMap<GooseFs, Map<string, Promise<MarkdownRead>>>();
const handoffs = new Map<string, MarkdownRead>();

export function readSharedMarkdown(
  fs: GooseFs,
  path: string,
  assertReadAllowed?: () => void,
  accessRequestId?: string,
): Promise<MarkdownRead> {
  let reads = inFlight.get(fs);
  if (!reads) {
    reads = new Map();
    inFlight.set(fs, reads);
  }
  const pending = reads.get(path);
  if (pending) return pending;
  const request = readMarkdownFile(fs, path, assertReadAllowed, accessRequestId).finally(() => reads!.delete(path));
  reads.set(path, request);
  return request;
}

export async function readUnchangedMarkdown(
  fs: GooseFs,
  path: string,
  assertReadAllowed?: () => void,
  accessRequestId?: string,
): Promise<MarkdownRead> {
  const stat = await statMarkdownFile(fs, path);
  assertReadAllowed?.();
  const content = getLocalMdSnapshot(path);
  if (stat && content !== undefined && isStatMatchingSnapshot(path, stat)) {
    return { content, stat };
  }
  return readSharedMarkdown(fs, path, assertReadAllowed, accessRequestId);
}

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
