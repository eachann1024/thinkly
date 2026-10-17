export function collectCatalog(root: string, generate: boolean): Promise<{
  entries: unknown[];
  stale: string[];
  codeFiles: Array<{ source: string; code: string }>;
}>;
