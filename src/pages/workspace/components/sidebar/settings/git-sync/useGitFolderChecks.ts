import { useEffect, useState } from "react";
import type { GitFolderCheck, GitSyncBridge } from "@/lib/git-sync-contract";

export function useGitFolderChecks(bridge: GitSyncBridge | undefined, active: boolean, paths: string[]) {
  const [checks, setChecks] = useState<Record<string, GitFolderCheck>>({});
  const [revision, setRevision] = useState(0);
  const pathsKey = JSON.stringify([...new Set(paths)].sort());
  useEffect(() => {
    if (!bridge || !active) return;
    let mounted = true;
    void (async () => {
      setChecks({});
      for (const path of JSON.parse(pathsKey) as string[]) {
        const result = await bridge.checkFolder(path).catch((error: unknown) => ({
          error: error instanceof Error ? error.message : "无法检查文件夹",
        }));
        if (!mounted) return;
        setChecks((current) => ({ ...current, [path]: result }));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [bridge, active, pathsKey, revision]);
  return { checks, recheck: () => setRevision((value) => value + 1) };
}
