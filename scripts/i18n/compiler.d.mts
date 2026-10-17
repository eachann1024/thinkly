export function transformMessages(code: string, filename: string): {
  code: string;
  map: import("magic-string").SourceMap | null;
  blocks: unknown[];
} | null;
