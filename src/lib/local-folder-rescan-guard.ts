let suppressed: { notebookId: string; token: number } | null = null;
let token = 0;

export function beginNotebookRescanSuppression(notebookId: string): number {
  token += 1;
  suppressed = { notebookId, token };
  return token;
}

export function endNotebookRescanSuppression(notebookId: string, generation: number): void {
  if (suppressed?.notebookId === notebookId && suppressed.token === generation) suppressed = null;
}

export function isNotebookRescanSuppressed(notebookId: string): boolean {
  return suppressed?.notebookId === notebookId;
}
