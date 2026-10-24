import { historyText as uiText } from "./messages";

import { ensureHistoryLayout } from "./legacyMigration";
import { findHistoryEntry, invalidatePortableIds, listHistoryEntries, META_FILE, type HistoryMeta } from "./layout";
import { historyDiskOperation, rendererHistoryDisk } from "./localDisk";
import { rebaseResourceContent } from "../local-resource-paths";

type HistoryMove = { id: string; from: string; to: string };

export async function withNotebookHistoryTransfer<T>(
  sourceBase: string,
  targetBase: string,
  targetNotebookId: string,
  moves: HistoryMove[],
  move: () => Promise<T>,
): Promise<T> {
  const fs = rendererHistoryDisk();
  if (!fs) throw new Error(uiText("historyStorageIsUnavailable"));
  const roots = [sourceBase, targetBase].sort();
  const locked = (index: number): Promise<T> =>
    index < roots.length
      ? historyDiskOperation(roots[index], () => locked(index + 1))
      : transfer();
  return locked(0);

  async function transfer(): Promise<T> {
    await ensureHistoryLayout(sourceBase, fs!);
    await ensureHistoryLayout(targetBase, fs!);
    const relocate = (path: string) => {
      const match = moves.find((entry) => path === entry.from || path.startsWith(entry.from + "/"));
      return match ? match.to + path.slice(match.from.length) : undefined;
    };
    const ids = new Map(moves.map((entry) => [entry.id, entry]));
    const planned: { sourceDir: string; meta: HistoryMeta; from: string; to: string }[] = [];
    for (const { dir, meta } of await listHistoryEntries(sourceBase, fs!)) {
      const byPath = meta.relativePath ? relocate(meta.relativePath) : undefined;
      const byId = ids.get(meta.pageId);
      const to = byPath ?? byId?.to;
      if (to) planned.push({ sourceDir: dir, meta, from: meta.relativePath ?? byId!.from, to });
    }
    const created: string[] = [];
    try {
      for (const entry of planned) {
        const target = await findHistoryEntry(targetBase, entry.meta.pageId, fs!);
        if (target.meta) throw new Error(uiText("theDestinationNotebookHasDifferentHistoryRecordsTheMove"));
        if (!(await fs!.exists(target.dir))) {
          if (!(await fs!.mkdir(target.dir))) throw new Error(uiText("couldnTCreateTheDestinationHistoryFolder"));
          created.push(target.dir);
        }
        const names = (await fs!.readDir(entry.sourceDir)).filter((file) => file.isFile && file.name.endsWith(".json") && file.name !== META_FILE);
        for (const file of names) {
          const text = await fs!.readFile(file.path);
          if (!text) throw new Error(uiText("theHistoryFileCouldnTBeReadTheMove"));
          const data = JSON.parse(text);
          if (data.pageId !== entry.meta.pageId) throw new Error(uiText("historyIdentifiersDonTMatchTheMoveStopped"));
          const content = JSON.stringify({
            ...data,
            ...(data.content != null ? {
              content: rebaseResourceContent(
                data.content,
                `${sourceBase}/${data.relativePath ?? entry.from}`,
                `${targetBase}/${entry.to}`,
                { from: `${sourceBase}/${moves[0].from}`, to: `${targetBase}/${moves[0].to}` },
              ),
            } : {}),
            workspaceId: targetNotebookId,
            relativePath: entry.to,
          }, null, 2) + "\n";
          const destination = `${target.dir}/${file.name}`;
          if (!(await fs!.writeFile(destination, content))) throw new Error(uiText("couldnTWriteTheMigratedHistory"));
          if ((await fs!.readFile(destination)) !== content) throw new Error(uiText("migratedHistoryFailedVerification"));
        }
        const meta = JSON.stringify({ ...entry.meta, relativePath: entry.to, previousPaths: [] }, null, 2) + "\n";
        const metaFile = `${target.dir}/${META_FILE}`;
        if (!(await fs!.writeFile(metaFile, meta)) || (await fs!.readFile(metaFile)) !== meta) throw new Error(uiText("migratedHistoryFailedVerification"));
      }
      const result = await move();
      for (const entry of planned) {
        if (!(await fs!.deleteDir(entry.sourceDir))) console.warn("[notebook-move] 原历史副本尚未清理", entry.sourceDir);
      }
      return result;
    } catch (error) {
      await Promise.allSettled(created.map((dir) => fs!.deleteDir(dir)));
      throw error;
    } finally {
      invalidatePortableIds(sourceBase);
      invalidatePortableIds(targetBase);
    }
  }
}
