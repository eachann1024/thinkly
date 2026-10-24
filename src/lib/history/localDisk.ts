import { HistoryWriteError } from "./messages";

export interface HistoryDisk {
  readFile(path: string): string | null | Promise<string | null>;
  writeFile(path: string, text: string): boolean | Promise<boolean>;
  readDir(path: string): { name: string; path: string; isDirectory: boolean; isFile: boolean }[] | Promise<{ name: string; path: string; isDirectory: boolean; isFile: boolean }[]>;
  exists(path: string): boolean | Promise<boolean>;
  mkdir(path: string): boolean | Promise<boolean>;
  deleteFile(path: string): boolean | Promise<boolean>;
  deleteDir(path: string): boolean | Promise<boolean>;
}

const queues = new Map<string, Promise<unknown>>();
export function historyDiskOperation<T>(basePath: string, operation: () => Promise<T>): Promise<T> {
  const previous = queues.get(basePath) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(operation);
  queues.set(basePath, next);
  void next.finally(() => { if (queues.get(basePath) === next) queues.delete(basePath); }).catch(() => {});
  return next;
}

export function rendererHistoryDisk(): HistoryDisk | null {
  if (typeof window === "undefined" || !window.gooseFs) return null;
  const fs = window.gooseFs;
  const purge = (path: string) => fs.purgeGoose ? fs.purgeGoose(path) : fs.deleteFile(path);
  return {
    readFile: (path) => fs.readFileAsync ? fs.readFileAsync(path) : fs.readFile(path),
    writeFile: (path, text) => fs.writeFileAsync ? fs.writeFileAsync(path, text) : fs.writeFile(path, text),
    readDir: (path) => fs.readDirAsync ? fs.readDirAsync(path) : fs.readDir(path),
    exists: (path) => fs.existsAsync ? fs.existsAsync(path) : fs.exists(path),
    mkdir: (path) => fs.mkdir(path), deleteFile: purge, deleteDir: purge,
  };
}

export async function writeHistoryJson(file: string, value: unknown, fs: HistoryDisk) {
  if (!await fs.writeFile(file, JSON.stringify(value, null, 2) + "\n")) throw new HistoryWriteError("file", file);
}
