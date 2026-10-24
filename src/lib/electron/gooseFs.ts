import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/electron/gooseFs.ts#localMessages:1">`
zh-Hans:
  desktopIntegrationIsUnavailable: "gooseDesktop 不可用"
en:
  desktopIntegrationIsUnavailable: "Desktop integration is unavailable"
ja:
  desktopIntegrationIsUnavailable: "デスクトップ連携を利用できません"
`;
const uiText = createTranslator(localMessages);
import { electronGooseFsShell } from "./gooseFsShell";

import { getGooseDesktop } from "./runtime";
import {
  rememberDiskWriteFailure,
  toDiskWriteError,
} from "@/lib/diskWriteError";

import {
  existsCache,
  rememberExists,
  bytesToBase64,
  toErrorMessage,
  writeFileImpl,
  watchImpl,
  unwatchImpl,
  writeTempFileImpl,
  cleanupTempFilesImpl,
  selectDirectoryImpl,
  restoreLastDirectoryImpl,
} from "./gooseFsHelpers";

export const electronGooseFs = {
  readDir: () => [] as unknown[],
  readDirAsync: async (dir: string) => {
    const api = getGooseDesktop();
    if (!api) throw new Error(uiText("desktopIntegrationIsUnavailable"));
    try {
      const entries = await api.fsReadDir(dir);
      rememberExists(dir, true);
      return entries.map((entry) => {
        rememberExists(entry.path, true);
        return {
          name: entry.name,
          isFile: !entry.isDirectory,
          isDirectory: entry.isDirectory,
          path: entry.path,
        };
      });
    } catch (error) {
      console.error("[electron-gooseFs] readDir failed", dir, error);
      throw error;
    }
  },

  readFile: () => null,
  readFileAsync: async (path: string) => {
    const api = getGooseDesktop();
    if (!api) return null;
    try {
      const content = await api.fsReadText(path);
      rememberExists(path, true);
      return content;
    } catch {
      return null;
    }
  },

  readFileBase64: () => null,
  readFileBase64Async: async (path: string) => {
    const api = getGooseDesktop();
    if (!api) return null;
    try {
      const bytes = await api.fsRead(path);
      rememberExists(path, true);
      return bytesToBase64(bytes);
    } catch {
      return null;
    }
  },

  readFileStat: undefined,
  readFileStatAsync: async (path: string) => {
    const api = getGooseDesktop();
    if (!api) return { ok: false, error: uiText("desktopIntegrationIsUnavailable"), content: null };
    try {
      const content = await api.fsReadText(path);
      rememberExists(path, true);
      return { ok: true, content };
    } catch (err) {
      return { ok: false, error: toErrorMessage(err), content: null };
    }
  },

  statAsync: async (path: string) => {
    const api = getGooseDesktop();
    if (!api) return null;
    try {
      const info = await api.fsStat(path);
      rememberExists(path, true);
      return { mtimeMs: info.mtimeMs, size: info.size };
    } catch {
      return null;
    }
  },

  writeFile: (path: string, content: string, encoding?: string) => {
    void writeFileImpl(path, content, encoding);
    return true;
  },
  writeFileAsync: writeFileImpl,
  createFileAsync: async (path: string, content: string) => {
    const api = getGooseDesktop();
    if (!api) return false;
    try {
      await api.fsWriteText(path, content, true);
      rememberExists(path, true);
      return true;
    } catch (error) {
      rememberDiskWriteFailure(toDiskWriteError(error, path));
      return false;
    }
  },

  exists: (path: string) => existsCache.get(path) ?? false,
  existsAsync: async (path: string) => {
    const api = getGooseDesktop();
    if (!api) return false;
    try {
      const result = await api.fsExists(path);
      rememberExists(path, result);
      return result;
    } catch {
      return false;
    }
  },

  realpathAsync: async (path: string) => {
    const api = getGooseDesktop();
    if (!api?.fsRealpath) return path;
    try {
      return await api.fsRealpath(path);
    } catch {
      return path;
    }
  },

  watch: watchImpl,
  unwatch: unwatchImpl,

  mkdir: async (dir: string) => {
    const api = getGooseDesktop();
    if (!api) return false;
    try {
      await api.fsMkdir(dir);
      rememberExists(dir, true);
      return true;
    } catch (err) {
      const diskError = toDiskWriteError(err, dir);
      rememberDiskWriteFailure(diskError);
      console.warn("[electron-gooseFs] mkdir 失败", dir, err);
      return false;
    }
  },

  deleteFile: async (path: string) => {
    const api = getGooseDesktop();
    if (!api) return false;
    try {
      await api.fsRemove(path);
      rememberExists(path, false);
      return true;
    } catch {
      return false;
    }
  },

  trashWithUndo: async (path: string) => {
    const api = getGooseDesktop();
    if (!api?.fsTrashWithUndo) throw new Error("desktop-unavailable");
    try {
      const token = await api.fsTrashWithUndo(path);
      if (!token) throw new Error("trash-failed");
      rememberExists(path, false);
      return token;
    } catch (error) {
      console.warn("[electron-gooseFs] trashWithUndo failed", path, error);
      throw error;
    }
  },

  undoTrash: async (token: string) => {
    const api = getGooseDesktop();
    if (!api?.fsUndoTrash) return false;
    const restoredPath = await api.fsUndoTrash(token);
    rememberExists(restoredPath, true);
    return true;
  },

  restoreFromTrash: async (path: string) => {
    const api = getGooseDesktop();
    if (!api?.restoreFromTrash) return false;
    try {
      const restored = await api.restoreFromTrash(path);
      if (restored) rememberExists(path, true);
      return restored;
    } catch {
      return false;
    }
  },

  deleteDir: async (path: string) => {
    const api = getGooseDesktop();
    if (!api) return false;
    try {
      await api.fsRemove(path);
      rememberExists(path, false);
      return true;
    } catch {
      return false;
    }
  },

  purgeGoose: async (path: string) => {
    const api = getGooseDesktop();
    if (!api?.fsPurgeGoose) return false;
    try {
      await api.fsPurgeGoose(path);
      rememberExists(path, false);
      return true;
    } catch {
      return false;
    }
  },

  rename: async (oldPath: string, newPath: string) => {
    const api = getGooseDesktop();
    if (!api) return false;
    try {
      await api.fsRename(oldPath, newPath);
      rememberExists(oldPath, false);
      rememberExists(newPath, true);
      return true;
    } catch (err) {
      console.warn("[electron-gooseFs] rename 失败", oldPath, newPath, err);
      return false;
    }
  },

  writeTempFile: writeTempFileImpl,
  cleanupTempFiles: cleanupTempFilesImpl,

  selectDirectory: selectDirectoryImpl,
  restoreLastDirectory: restoreLastDirectoryImpl,

  ...electronGooseFsShell,
} as unknown as GooseFs;

export function installElectronGooseFs(): boolean {
  if (typeof window === "undefined") return false;
  if (window.gooseFs) return false;
  window.gooseFs = electronGooseFs;
  return true;
}
