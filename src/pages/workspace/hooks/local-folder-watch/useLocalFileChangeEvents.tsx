import { useLocale } from "@/i18n";
import {
  readSharedMarkdown,
  withMarkdownReadHandoff,
} from "@/lib/local-folder-scanner/read-cache";
import { useEffect, useRef } from "react";
import { usePages } from "@/stores/usePages";
import {
  isDiskContentMatchingSnapshot,
  wasRecentlySelfWritten,
  updateSnapshotStat,
  isStatMatchingSnapshot,
  type LocalMdFileStat,
} from "@/lib/local-md-snapshot";
import { wasRecentlySelfMoved } from "@/stores/pages/actions/localFolder/move";
import { useSettings } from "@/stores/useSettings";
import { shouldIgnoreLocalRelativePath } from "@/lib/local-folder-scanner";
import { wasRecentlyInteracting } from "@/lib/editor-interaction-signal";
import { isNotebookRescanSuppressed } from "@/lib/local-folder-rescan-guard";
import {
  type UseLocalFolderWatchOptions,
  readDiskContent,
  statDisk,
  showConflictToast,
  conflictHandlers,
} from "./shared";

export function useLocalFileChangeEvents({
  notebook,
  activePageId,
  page,
}: UseLocalFolderWatchOptions) {
  useLocale();
  const renameDebounceTimers = useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map());

  const changeDebounceTimers = useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map());

  useEffect(() => {
    const processChangeEvent = async (filePath: string) => {
      if (!notebook || isNotebookRescanSuppressed(notebook.id)) return;
      const pages = usePages.getState().pages;
      const target = Object.values(pages).find(
        (p) =>
          p.workspaceId === notebook.id &&
          !p.isFolder &&
          (p.localFilePath === filePath ||
            p.localFilePath?.replace(/\\/g, "/") ===
              filePath.replace(/\\/g, "/")),
      );
      if (!target) return;

      const selfWrite = wasRecentlySelfWritten(filePath);
      let statMatch = false;
      const dirty = Boolean(usePages.getState().dirtyLocalPageIds[target.id]);

      const debugWatch = (contentMatch?: boolean) => {
        if (import.meta.env.DEV) {
          console.debug("[local-folder-watch]", {
            path: filePath,
            eventType: "change",
            selfWrite,
            statMatch,
            contentMatch,
            dirty,
          });
        }
      };

      if (selfWrite) {
        debugWatch();
        return;
      }

      let diskStat: LocalMdFileStat | null;
      try {
        diskStat = await statDisk(filePath);
      } catch {
        diskStat = null;
      }
      if (diskStat && isStatMatchingSnapshot(filePath, diskStat)) {
        statMatch = true;
        debugWatch();
        return;
      }

      const fs = window.gooseFs;
      if (!fs) return;
      const read = await readSharedMarkdown(fs, filePath).catch(() => null);
      const diskContent = read?.content;
      if (diskContent == null) {
        debugWatch();
        return;
      }
      const contentMatch = isDiskContentMatchingSnapshot(filePath, diskContent);
      if (contentMatch) {
        if (read?.stat) updateSnapshotStat(filePath, read.stat);
        debugWatch(contentMatch);
        return;
      }

      debugWatch(contentMatch);
      const isDirty = Boolean(usePages.getState().dirtyLocalPageIds[target.id]);
      if (isDirty || wasRecentlyInteracting(2000)) {
        const { onKeepMine, onLoadDisk } = conflictHandlers(
          filePath,
          target.id,
        );
        showConflictToast(filePath, target.id, onKeepMine, onLoadDisk);
        return;
      }

      if (
        read &&
        usePages.getState().pages[target.id]?.localFilePath === filePath
      ) {
        withMarkdownReadHandoff(filePath, read, () => {
          void usePages.getState().reloadLocalPageFromDisk(target.id);
        });
      }
    };

    const handleFileChange = async (event: Event) => {
      if (notebook?.id && isNotebookRescanSuppressed(notebook.id)) return;
      const customEvent = event as CustomEvent;
      const { eventType, filename, dirPath } = customEvent.detail;
      if (
        notebook?.source !== "local-folder" ||
        notebook.localPath !== dirPath
      ) {
        return;
      }

      if (
        typeof filename === "string" &&
        shouldIgnoreLocalRelativePath(
          filename,
          useSettings.getState().localFolderHiddenFolders,
        )
      ) {
        return;
      }

      const gooseFs = window.gooseFs;
      if (!gooseFs) return;
      const filePath = `${dirPath}/${filename}`;

      if (eventType === "change") {
        const existing = changeDebounceTimers.current.get(filePath);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(() => {
          changeDebounceTimers.current.delete(filePath);
          void processChangeEvent(filePath);
        }, 200);
        changeDebounceTimers.current.set(filePath, timer);
        return;
      }

      if (eventType === "rename") {
        const debounceKey = filePath;
        const existing = renameDebounceTimers.current.get(debounceKey);
        if (existing) clearTimeout(existing);

        const timer = setTimeout(async () => {
          renameDebounceTimers.current.delete(debounceKey);
          if (notebook?.id && isNotebookRescanSuppressed(notebook.id)) return;

          if (
            wasRecentlySelfMoved(filePath) ||
            wasRecentlySelfWritten(filePath)
          ) {
            return;
          }

          const exists = gooseFs.existsAsync
            ? await gooseFs.existsAsync(filePath)
            : gooseFs.exists(filePath);

          if (!exists) {
            const isMdFile = /\.(md|markdown)$/i.test(filePath);
            if (isMdFile) {
              usePages.getState().removeSingleLocalPage(filePath);
            } else {
              if (notebook.id && notebook.localPath) {
                void usePages
                  .getState()
                  .loadLocalFolderPages(notebook.id, notebook.localPath)
                  .catch((error) => {
                    console.error("[local-folder] rescan failed", error);
                  });
              }
            }
          } else {
            const isMdFile = /\.(md|markdown)$/i.test(filePath);
            if (isMdFile && notebook.id && notebook.localPath) {
              const existingPage = Object.values(
                usePages.getState().pages,
              ).find(
                (candidate) =>
                  candidate.workspaceId === notebook.id &&
                  !candidate.isFolder &&
                  candidate.localFilePath?.replace(/\\/g, "/") ===
                    filePath.replace(/\\/g, "/"),
              );
              if (existingPage) {
                const diskContent = await readDiskContent(filePath);
                if (
                  diskContent !== null &&
                  isDiskContentMatchingSnapshot(filePath, diskContent)
                ) {
                  return;
                }
              }
              void usePages
                .getState()
                .addSingleLocalPage(notebook.id, notebook.localPath, filePath);
            } else if (!isMdFile) {
              if (notebook.id && notebook.localPath) {
                void usePages
                  .getState()
                  .loadLocalFolderPages(notebook.id, notebook.localPath)
                  .catch((error) => {
                    console.error("[local-folder] rescan failed", error);
                  });
              }
            }
          }
        }, 300);

        renameDebounceTimers.current.set(debounceKey, timer);
      }
    };

    window.addEventListener("goose-note:file-changed", handleFileChange);
    const changeTimers = changeDebounceTimers.current;
    return () => {
      window.removeEventListener("goose-note:file-changed", handleFileChange);
      changeTimers.forEach((timer) => clearTimeout(timer));
      changeTimers.clear();
    };
  }, [notebook, activePageId, page]);
  return {
    notebook,
    activePageId,
    page,
    renameDebounceTimers,
    changeDebounceTimers,
  };
}
