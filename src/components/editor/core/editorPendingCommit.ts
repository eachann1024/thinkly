export interface PendingEditorCommitInput<T> {
  targetPageId: string | null | undefined;
  currentPageId: string | null;
  pending: boolean;
  content: T;
  signature: string;
  syncedSignature: string | null;
  commit: (content: T) => void;
}

export type PendingEditorCommitResult =
  | "committed"
  | "no-page"
  | "stale-page"
  | "not-pending"
  | "unchanged";

const UNRELIABLE_CONTENT_SIGNATURE = "__goose-note-unserializable-content__";

export const pendingContentAlreadyPersisted = (
  signature: string,
  persistedSignature: string | null,
): boolean => persistedSignature !== null
  && signature === persistedSignature
  && signature !== UNRELIABLE_CONTENT_SIGNATURE;

export const commitPendingEditorChange = <T>(
  input: PendingEditorCommitInput<T>,
): PendingEditorCommitResult => {
  if (!input.targetPageId) return "no-page";
  if (input.targetPageId !== input.currentPageId) return "stale-page";
  if (!input.pending) return "not-pending";
  if (pendingContentAlreadyPersisted(input.signature, input.syncedSignature)) return "unchanged";
  input.commit(input.content);
  return "committed";
};
