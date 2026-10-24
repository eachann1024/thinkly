import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/hooks/local-folder-watch/useLocalFolderWatchLifecycle.tsx#localMessages:1">`
zh-Hans:
  saveFailed: "「{{name}}」保存失败"
  anotherPagePointsToTheSameLocal: "检测到另一个页面已指向同一个本地文件，请重新加载本地文件夹后再试。"
en:
  saveFailed: "Couldn’t save {{name}}"
  anotherPagePointsToTheSameLocal: "Another page points to the same local file. Reload the local folder and try again."
ja:
  saveFailed: "「{{name}}」を保存できませんでした"
  anotherPagePointsToTheSameLocal: "別のページが同じローカルファイルを参照しています。ローカルフォルダを再読み込みしてから、もう一度お試しください。"
`;
const uiText = createTranslator(localMessages);
import { useEffect } from "react";
import { toast } from "@/components/ui/sonner";
import { usePages } from "@/stores/usePages";
import {
  showConflictToast,
  conflictHandlers,
  checkLocalPageFreshness,
} from "./shared";
import type { useLocalFileChangeEvents } from "./useLocalFileChangeEvents";

export function useLocalFolderWatchLifecycle(
  input: ReturnType<typeof useLocalFileChangeEvents>,
) {
  useLocale();
  const { notebook, activePageId, renameDebounceTimers, changeDebounceTimers } =
    input;

  useEffect(() => {
    const handlePreSaveConflict = (event: Event) => {
      const { pageId, filePath } = (event as CustomEvent).detail as {
        pageId: string;
        filePath: string;
      };

      const { onKeepMine, onLoadDisk } = conflictHandlers(filePath, pageId);
      showConflictToast(filePath, pageId, onKeepMine, onLoadDisk);
    };

    window.addEventListener(
      "goose-note:local-file-conflict",
      handlePreSaveConflict,
    );
    return () => {
      window.removeEventListener(
        "goose-note:local-file-conflict",
        handlePreSaveConflict,
      );
    };
  }, []);

  useEffect(() => {
    const handleDuplicateLocalFile = (event: Event) => {
      const { filePath } = (event as CustomEvent).detail as {
        pageId: string;
        duplicatePageId: string;
        filePath: string;
      };
      const fileName = filePath.replace(/^.*[\\/]/, "");
      toast.error(uiText("saveFailed", {name: fileName}), {
        description:
          uiText("anotherPagePointsToTheSameLocal"),
      });
    };

    window.addEventListener(
      "goose-note:local-file-duplicate",
      handleDuplicateLocalFile,
    );
    return () => {
      window.removeEventListener(
        "goose-note:local-file-duplicate",
        handleDuplicateLocalFile,
      );
    };
  }, []);

  useEffect(() => {
    if (!activePageId) return;
    void checkLocalPageFreshness(activePageId);
  }, [activePageId, notebook?.id, notebook?.source]);

  useEffect(() => {
    const check = () => {
      if (document.visibilityState === "hidden") return;
      const pid = usePages.getState().activePageId;
      if (pid) void checkLocalPageFreshness(pid);
    };
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [notebook?.id, notebook?.source]);

  useEffect(() => {
    const gfs = window.gooseFs;
    const renameTimers = renameDebounceTimers.current;
    const changeTimers = changeDebounceTimers.current;
    if (notebook?.source === "local-folder" && notebook.localPath && gfs) {
      const dirExists = gfs.exists(notebook.localPath);
      if (dirExists) {
        try {
          gfs.watch(
            notebook.localPath,
            (_eventType: string, _filename: string) => {
            },
          );
        } catch {
        }
      }
    }

    return () => {
      renameTimers.forEach((timer) => clearTimeout(timer));
      renameTimers.clear();
      changeTimers.forEach((timer) => clearTimeout(timer));
      changeTimers.clear();

      if (notebook?.localPath && window.gooseFs) {
        try {
          window.gooseFs.unwatch(notebook.localPath!);
        } catch {
        }
      }
    };
  }, [notebook?.id, notebook?.localPath]);
  return { ...input };
}
