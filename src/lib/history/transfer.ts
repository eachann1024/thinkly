import {
  historyDiskOperation,
  readHistoryLocations,
  rendererHistoryDisk,
  writeHistoryJson,
} from "./localDisk";
import { historyHash, originalHistoryPath } from "./localPaths";
import { rebaseResourceContent } from "../local-resource-paths";

type HistoryMove = { id: string; from: string; to: string };

/** 先复制并核对历史，再移动正文；正文失败时撤掉新副本，成功后清理旧副本。 */
export async function withNotebookHistoryTransfer<T>(
  sourceBase: string,
  targetBase: string,
  targetNotebookId: string,
  moves: HistoryMove[],
  move: () => Promise<T>,
): Promise<T> {
  const fs = rendererHistoryDisk();
  if (!fs) throw new Error("历史文件系统不可用");
  const roots = [sourceBase, targetBase].sort();
  const locked = (index: number): Promise<T> =>
    index < roots.length
      ? historyDiskOperation(roots[index], () => locked(index + 1))
      : transfer();
  return locked(0);

  async function transfer(): Promise<T> {
    const sourceRoot = `${sourceBase}/.goose/history`;
    if (!(await fs!.exists(sourceRoot))) return move();
    const source = await readHistoryLocations(sourceBase, fs!);
    const target = await readHistoryLocations(targetBase, fs!);
    const previousTarget = JSON.stringify(target);
    const entries = new Map(moves.map((entry) => [entry.id, entry]));
    const relocate = (path: string) => {
      const match = moves.find(
        (entry) => path === entry.from || path.startsWith(entry.from + "/"),
      );
      return match ? match.to + path.slice(match.from.length) : undefined;
    };
    for (const [id, location] of Object.entries(source.pages)) {
      const to = relocate(location.relativePath);
      if (to) entries.set(id, { id, from: location.relativePath, to });
    }
    // 兼容尚未迁到按笔记路径分组的旧历史文件。
    for (const file of await fs!.readDir(sourceRoot)) {
      if (!file.isFile || !/^[a-f0-9]{8}\..+\.json$/.test(file.name)) continue;
      const text = await fs!.readFile(`${sourceRoot}/${file.name}`);
      if (!text) throw new Error("历史文件无法读取，已停止移动");
      const data = JSON.parse(text);
      const from =
        data.relativePath ?? originalHistoryPath(data.pageId, data.workspaceId);
      const to = from && relocate(from);
      if (to && typeof data.pageId === "string")
        entries.set(data.pageId, { id: data.pageId, from, to });
    }
    const created: string[] = [];
    const originals = new Set<string>();
    let published = false;
    try {
      for (const entry of entries.values()) {
        const location = source.pages[entry.id];
        const directories = new Set([
          sourceRoot,
          `${sourceRoot}/${entry.from}`,
          ...[location?.relativePath, ...(location?.previousPaths ?? [])]
            .filter((path): path is string => !!path)
            .map((path) => `${sourceRoot}/${path}`),
        ]);
        const destination = `${targetBase}/.goose/history/${entry.to}`;
        let hasHistory = false;
        for (const directory of directories) {
          if (!(await fs!.exists(directory))) continue;
          for (const file of await fs!.readDir(directory)) {
            if (
              !file.isFile ||
              !file.name.startsWith(`${historyHash(entry.id)}.`) ||
              !file.name.endsWith(".json")
            )
              continue;
            const from = `${directory}/${file.name}`,
              to = `${destination}/${file.name}`;
            const text = await fs!.readFile(from);
            if (!text) throw new Error("历史文件无法读取，已停止移动");
            const data = JSON.parse(text);
            if (data.pageId !== entry.id)
              throw new Error("历史标识不一致，已停止移动");
            const content =
              JSON.stringify(
                {
                  ...data,
                  ...(data.content != null
                    ? {
                        content: rebaseResourceContent(
                          data.content,
                          `${sourceBase}/${data.relativePath ?? entry.from}`,
                          `${targetBase}/${entry.to}`,
                          {
                            from: `${sourceBase}/${moves[0].from}`,
                            to: `${targetBase}/${moves[0].to}`,
                          },
                        ),
                      }
                    : {}),
                  workspaceId: targetNotebookId,
                  relativePath: entry.to,
                },
                null,
                2,
              ) + "\n";
            if (
              !(await fs!.exists(destination)) &&
              !(await fs!.mkdir(destination))
            )
              throw new Error("无法创建目标历史目录");
            const existing = (await fs!.exists(to))
              ? await fs!.readFile(to)
              : null;
            if (existing !== null && existing !== content)
              throw new Error("目标记事本已有不同历史记录，已停止移动");
            if (existing === null) {
              created.push(to);
              if (!(await fs!.writeFile(to, content)))
                throw new Error("历史迁移写入失败");
            }
            if ((await fs!.readFile(to)) !== content)
              throw new Error("历史迁移校验失败");
            originals.add(from);
            hasHistory = true;
          }
        }
        if (hasHistory)
          target.pages[entry.id] = {
            relativePath: entry.to,
            previousPaths: [],
          };
      }
      if (created.length || originals.size) {
        published = true;
        await writeHistoryJson(
          `${targetBase}/.goose/history-map.json`,
          target,
          fs!,
        );
      }
      const result = await move();
      // 正文已移动，清理失败只保留额外历史副本，不能撤回目标的有效历史。
      try {
        for (const id of entries.keys()) delete source.pages[id];
        await writeHistoryJson(
          `${sourceBase}/.goose/history-map.json`,
          source,
          fs!,
        );
        for (const path of originals) await fs!.deleteFile(path);
      } catch (error) {
        console.warn("[notebook-move] 原历史副本尚未清理", error);
      }
      return result;
    } catch (error) {
      if (published)
        await writeHistoryJson(
          `${targetBase}/.goose/history-map.json`,
          JSON.parse(previousTarget),
          fs!,
        );
      await Promise.allSettled(created.map((path) => fs!.deleteFile(path)));
      throw error;
    }
  }
}
