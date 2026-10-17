import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/git-sync/useGitFolderChecks.ts#localMessages:1">`
zh-Hans:
  couldNotCheckFolder_5d5e: "无法检查文件夹"
en:
  couldNotCheckFolder_5d5e: "Could not check folder"
ja:
  couldNotCheckFolder_5d5e: "フォルダを確認できませんでした"
`;
const uiText = createTranslator(localMessages);
import { localizeGitUiReason } from "./gitSyncUiState";
import { useCallback, useEffect, useState } from "react";
import type { GitFolderCheck, GitSyncBridge } from "@/lib/git-sync-contract";
import { getGooseDesktop } from "@/lib/electron/runtime";
import { isCanonicalPathInside } from "@/lib/canonicalLocalPath";

export function useGitFolderChecks(bridge: GitSyncBridge | undefined, active: boolean, paths: string[], notebookRevision: string) {
  useLocale();
  const [checks, setChecks] = useState<Record<string, GitFolderCheck & { failed?: boolean }>>({});
  const [revision, setRevision] = useState(0);
  const pathsKey = JSON.stringify([...new Set(paths)].sort());
  useEffect(() => {
    if (!bridge || !active) return;
    let mounted = true, running = false, queued = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const roots = JSON.parse(pathsKey) as string[];
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void refresh(), 250);
    };
    const refresh = async () => {
      if (!mounted) return;
      if (running) { queued = true; return; }
      running = true;
      const results = await Promise.all(roots.map(async (path) => {
        const result = await bridge.checkFolder(path).catch((error: unknown) => ({
          failed: true, error: error instanceof Error ? error.message : null,
        }));
        return [path, result] as const;
      }));
      running = false;
      if (!mounted) return;
      setChecks(Object.fromEntries(results));
      if (queued) { queued = false; schedule(); }
    };
    const onVisible = () => { if (document.visibilityState !== "hidden") schedule(); };
    const unsubscribe = getGooseDesktop()?.onFsChange(({ path }) => {
      if (roots.some((root) => isCanonicalPathInside(path, root) || isCanonicalPathInside(root, path))) schedule();
    });
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    void refresh();
    return () => {
      mounted = false;
      clearTimeout(timer);
      unsubscribe?.();
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [bridge, active, pathsKey, revision, notebookRevision]);
  return { checks: Object.fromEntries(Object.entries(checks).map(([path, check]) => [path, { ...check, error: check.error ? localizeGitUiReason(check.error) : check.failed ? uiText("couldNotCheckFolder_5d5e") : null }])), recheck: useCallback(() => setRevision((value) => value + 1), []) };
}
