import { markdownDigest } from "@/lib/note-metadata/contract";
import type { HistoryDisk } from "./localDisk";

export type HistoryTransferFile = { path: string; text: string };

export async function prepareHistoryTransferFiles(
  fs: HistoryDisk, sourceRoot: string, targetRoot: string, files: HistoryTransferFile[],
): Promise<void> {
  const native = typeof window !== "undefined" ? window.gooseFs : null;
  if (!native?.createFileAsync) throw new Error("Exclusive history transfer API unavailable");
  for (const file of files) {
    await assertBoundary(targetRoot, file.path);
    if (await fs.exists(file.path) && await fs.readFile(file.path) !== file.text) {
      throw new Error("Destination history differs; the original history was preserved");
    }
  }
  if (!files.length) return;
  const manifest = JSON.stringify({ version: 1, kind: "history-transfer", sourceRoot, targetRoot, files });
  const directory = `${sourceRoot}/.goose/transfers`;
  await assertBoundary(sourceRoot, directory);
  if (!await fs.mkdir(directory)) throw new Error("Cannot create history transfer journal");
  await assertBoundary(sourceRoot, directory);
  const createOrVerify = async (file: HistoryTransferFile) => {
    if (await fs.exists(file.path)) {
      if (await fs.readFile(file.path) !== file.text) throw new Error("History transfer conflicts with an existing file");
      return;
    }
    try { await native.createFileAsync!(file.path, file.text); } catch {}
    if (await fs.readFile(file.path) !== file.text) throw new Error("History transfer write failed verification");
  };
  await createOrVerify({ path: `${directory}/${await markdownDigest(manifest)}.json`, text: manifest });
  for (const file of files) {
    if (!await fs.mkdir(file.path.slice(0, file.path.lastIndexOf("/")))) throw new Error("Cannot create destination history directory");
    await assertBoundary(targetRoot, file.path);
    await createOrVerify(file);
  }

  async function assertBoundary(root: string, file: string): Promise<void> {
    if (!native?.realpathAsync) return;
    const canonical = (value: string) => value.replace(/\\/g, "/").replace(/\/+$/, "");
    const base = canonical(await native.realpathAsync(root) ?? root);
    const relative = file.slice(root.length + 1).split("/");
    for (let index = 1; index <= relative.length; index++) {
      const logical = `${root}/${relative.slice(0, index).join("/")}`;
      const actual = await native.realpathAsync(logical);
      if (actual && actual !== logical && !canonical(actual).startsWith(`${base}/`)) throw new Error("History transfer resolves outside the notebook");
    }
  }
}
