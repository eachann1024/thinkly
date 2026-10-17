import { historyText as uiText } from "./messages";

import type { HistoryBackend } from "./backend";
import type { HistoryIndex, HistoryIndexEntry } from "./types";
import { normalizeHistoryIndex } from "./guards";
import {
  parseHistoryVersion,
  invalidateHistoryVersion,
} from "./versionReadCache";
import { historyHash } from "./localPaths";
import {
  bindHistoryLocation,
  historyDiskOperation,
  readHistoryLocations,
  rendererHistoryDisk,
  writeHistoryJson,
} from "./localDisk";

export function makeLocalFolderHistoryBackend(
  basePath: string,
  relativePath: (pageId: string) => string | null,
): HistoryBackend {
  async function operation<T>(
    pageId: string,
    run: (
      directory: string,
      fs: NonNullable<ReturnType<typeof rendererHistoryDisk>>,
    ) => Promise<T>,
    unavailable: T,
  ) {
    const fs = rendererHistoryDisk();
    if (!fs) return unavailable;
    return historyDiskOperation(basePath, async () =>
      run(
        await bindHistoryLocation(basePath, pageId, relativePath(pageId), fs),
        fs,
      ),
    );
  }
  async function sources(
    pageId: string,
    fs: NonNullable<ReturnType<typeof rendererHistoryDisk>>,
  ) {
    const locations = await readHistoryLocations(basePath, fs);
    const relative = locations.pages[pageId]?.relativePath;
    return [
      pageId,
      ...Object.entries(locations.pages)
        .filter(
          ([id, entry]) => id !== pageId && entry.relativePath === relative,
        )
        .map(([id]) => id),
    ];
  }
  const file = (directory: string, id: string, version: string) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(version)) throw new Error(uiText("invalidVersionHistoryIdentifier"));
    return `${directory}/${historyHash(id)}.${version}.json`;
  };
  return {
    loadIndex(pageId) {
      return operation(
        pageId,
        async (directory, fs) => {
          const entries = new Map<string, HistoryIndexEntry>();
          for (const id of await sources(pageId, fs)) {
            const path = file(directory, id, "index");
            const text = (await fs.exists(path))
              ? await fs.readFile(path)
              : null;
            const data = text ? (JSON.parse(text) as HistoryIndex) : null;
            if (data && data.pageId !== id)
              throw new Error(uiText("versionHistoryIndexIdentifiersDonTMatch"));
            for (const entry of normalizeHistoryIndex(data, id).versions) {
              if (
                !entries.has(entry.versionId) &&
                (await fs.exists(file(directory, id, entry.versionId)))
              )
                entries.set(entry.versionId, entry);
            }
          }
          const versions = [...entries.values()].sort(
            (a, b) =>
              a.createdAt - b.createdAt ||
              a.versionId.localeCompare(b.versionId),
          );
          return {
            pageId,
            versions,
            lastVersionCharCount: versions.at(-1)?.charCount ?? 0,
          };
        },
        { pageId, versions: [], lastVersionCharCount: 0 },
      );
    },
    saveIndex(index) {
      return operation(
        index.pageId,
        async (directory, fs) => {
          await writeHistoryJson(
            file(directory, index.pageId, "index"),
            {
              ...index,
              relativePath: directory.slice(
                `${basePath}/.goose/history/`.length,
              ),
            },
            fs,
          );
        },
        undefined,
      );
    },
    loadVersion(pageId, versionId) {
      return operation(
        pageId,
        async (directory, fs) => {
          for (const id of await sources(pageId, fs)) {
            const path = file(directory, id, versionId);
            const version = parseHistoryVersion(
              path,
              (await fs.exists(path)) ? await fs.readFile(path) : null,
              id,
              versionId,
            );
            if (version)
              return id === pageId ? version : { ...version, pageId };
          }
          return null;
        },
        null,
      );
    },
    saveVersion(version) {
      return operation(
        version.pageId,
        async (directory, fs) => {
          const path = file(directory, version.pageId, version.versionId);
          invalidateHistoryVersion(path);
          await writeHistoryJson(
            path,
            {
              ...version,
              relativePath: directory.slice(
                `${basePath}/.goose/history/`.length,
              ),
            },
            fs,
          );
        },
        undefined,
      );
    },
    removeVersion(pageId, versionId) {
      return operation(
        pageId,
        async (directory, fs) => {
          for (const id of await sources(pageId, fs)) {
            const path = file(directory, id, versionId);
            invalidateHistoryVersion(path);
            if ((await fs.exists(path)) && !(await fs.deleteFile(path)))
              throw new Error(uiText("couldnTClearVersionHistory"));
          }
        },
        undefined,
      );
    },
    dropAll(pageId) {
      return operation(
        pageId,
        async (directory, fs) => {
          const ids = await sources(pageId, fs);
          for (const entry of await fs.readDir(directory)) {
            if (
              !entry.isFile ||
              !ids.some((id) => entry.name.startsWith(`${historyHash(id)}.`))
            )
              continue;
            const path = `${directory}/${entry.name}`;
            invalidateHistoryVersion(path);
            if (!(await fs.deleteFile(path)))
              throw new Error(uiText("couldnTPermanentlyClearVersionHistory"));
          }
          const locations = await readHistoryLocations(basePath, fs);
          for (const id of ids) delete locations.pages[id];
          await writeHistoryJson(
            `${basePath}/.goose/history-map.json`,
            locations,
            fs,
          );
        },
        undefined,
      );
    },
  };
}
