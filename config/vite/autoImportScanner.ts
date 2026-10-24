import path from "node:path";
import { readFile, realpath } from "node:fs/promises";
import ts from "typescript";
import { dedupeDtsExports, normalizeScanDirs, scanDirExports, scanExports, scanFilesFromDir, type Import } from "unimport";

export type PublicImportScanMetrics = { entryScans: number; dependencyReads: number; typeParses: number };
type EntryScan = { imports: Import[]; mixed: Import[]; dependencies: Set<string> };
const absolute = (root: string, file: string) => path.resolve(root, file).replaceAll("\\", "/");
async function dependencyPaths(root: string, files: string[]) {
  const paths = files.map((file) => absolute(root, file));
  const resolved = await Promise.all(paths.map((file) => realpath(file).catch(() => file)));
  return new Set([...paths, ...resolved.map((file) => absolute(root, file))]);
}

async function mixedTypes(from: string): Promise<Import[]> {
  const imports: Import[] = [];
  const source = ts.createSourceFile(from, await readFile(from, "utf8"), ts.ScriptTarget.Latest, true);
  for (const statement of source.statements) {
    if (!ts.isExportDeclaration(statement) || !statement.exportClause || !ts.isNamedExports(statement.exportClause)) continue;
    for (const item of statement.exportClause.elements) {
      if (statement.isTypeOnly || item.isTypeOnly) imports.push({ from, name: item.name.text, as: item.name.text, type: true });
    }
  }
  return imports;
}

function appendMixed(imports: Import[], mixed: Import[][]): Import[] {
  const result = [...imports];
  const known = new Set(imports.map((item) => `${item.from}:${item.name}:${Boolean(item.type)}`));
  for (const items of mixed) for (const item of items) {
    const key = `${item.from}:${item.name}:true`;
    if (!known.has(key)) { known.add(key); result.push(item); }
  }
  return result;
}

export async function scanPublicImports(
  entries: string[],
  root: string,
): Promise<Import[]> {
  return appendMixed(await scanDirExports(entries, { cwd: root }),
    await Promise.all(entries.map((entry) => mixedTypes(absolute(root, entry)))));
}

export function createPublicImportScanner(entries: string[], root: string, metrics: PublicImportScanMetrics) {
  let order: string[] | undefined, records = new Map<string, EntryScan>(), previous: Import[] = [];
  return {
    async scan(paths: string[] | null = null): Promise<Import[]> {
      const full = paths === null || !order;
      const files = full ? await scanFilesFromDir(normalizeScanDirs(entries, { cwd: root }), { cwd: root }) : order!;
      const dirty = await dependencyPaths(root, paths ?? []);
      const affected = files.filter((file) => full || [...records.get(file)!.dependencies].some((dependency) => dirty.has(dependency)));
      if (!affected.length && order) return previous;
      const settled = await Promise.allSettled(affected.map(async (file): Promise<[string, EntryScan]> => {
        metrics.entryScans++;
        const seen = new Set<string>();
        const imports = await scanExports(file, true, seen);
        metrics.dependencyReads += seen.size; metrics.typeParses++;
        return [file, { imports, mixed: await mixedTypes(file), dependencies: await dependencyPaths(root, [...seen]) }];
      }));
      const failure = settled.find((result) => result.status === "rejected");
      if (failure?.status === "rejected") throw failure.reason;
      const updated = settled.map((result) => (result as PromiseFulfilledResult<[string, EntryScan]>).value);
      const next = full ? new Map(updated) : new Map([...records, ...updated]);
      const imports = appendMixed(dedupeDtsExports(files.flatMap((file) => next.get(file)!.imports)),
        entries.map((entry) => next.get(absolute(root, entry))!.mixed));
      records = next; order = files; previous = imports;
      return imports;
    },
  };
}
