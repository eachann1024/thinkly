
const MARKDOWN_EXT = /\.(md|markdown)$/i;

export type ArgvOpenOptions = {
  packaged: boolean;
  execPath: string;
};

export function isMarkdownDocumentPath(filePath: string): boolean {
  const trimmed = filePath.trim();
  if (!trimmed) return false;
  const base = trimmed.split(/[\\/]/).pop() ?? trimmed;
  return MARKDOWN_EXT.test(base);
}

function looksLikeFlag(arg: string): boolean {
  return arg.startsWith("-");
}

export function collectMarkdownPathsFromArgv(
  argv: string[],
  options: ArgvOpenOptions,
): string[] {
  const start = options.packaged ? 1 : 2;
  const skip = new Set(
    [options.execPath, argv[0], options.packaged ? "" : (argv[1] ?? "")]
      .filter((value) => value.length > 0),
  );
  const out: string[] = [];
  const seen = new Set<string>();

  for (let index = start; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg || looksLikeFlag(arg) || arg === ".") continue;
    if (skip.has(arg)) continue;
    if (!isMarkdownDocumentPath(arg)) continue;
    if (seen.has(arg)) continue;
    seen.add(arg);
    out.push(arg);
  }

  return out;
}
