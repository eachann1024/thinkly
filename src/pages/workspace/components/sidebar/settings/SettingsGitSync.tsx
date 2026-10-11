import { useGitSyncState } from "./git-sync/useGitSyncState";
import {
  gitSyncSummary,
  newRemotePath,
  availableFolderIds,
  emptyDraft,
  messageOf,
  validateRepositoryInput,
} from "./git-sync/gitSyncPresentation";
import { GitSyncContent } from "./git-sync/GitSyncContent";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type GitRepositoryFolder,
  type GitRepositoryInput,
  type GitSyncBridge,
  type GitSyncState,
} from "@/lib/git-sync-contract";
import { getGooseDesktop } from "@/lib/electron/runtime";
import { selectRecoveryPath, rebindOpenedFolder } from "./git-sync/folderRecovery";
import { useGitFolderChecks } from "./git-sync/useGitFolderChecks";
import { useNotebooks } from "@/stores/useNotebooks";
import { type GitDraft } from "./git-sync/GitRepositoryForm";

export function SettingsGitSync({ visible = true }: { visible?: boolean }) {
  const notebooks = useNotebooks((store) => store.notebooks);
  const localNotebooks = useMemo(
    () => Object.values(notebooks).filter((item) => item.source === "local-folder" && item.localPath),
    [notebooks],
  );
  const [bridge] = useState(
    () => (window as Window & { gooseDesktop?: { gitSync?: GitSyncBridge } }).gooseDesktop?.gitSync,
  );
  const { state, setState, loading, loadError, reload } = useGitSyncState(bridge, visible);
  const [selectedId, setSelectedId] = useState("");
  const [newId, setNewId] = useState(() => crypto.randomUUID());
  const [adding, setAdding] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, GitDraft>>({});
  const [folderDrafts, setFolderDrafts] = useState<Record<string, GitRepositoryFolder[]>>({});
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, string>>({});
  const locks = useRef(new Set<string>());
  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const timers = saveTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);
  const mappings = useRef(new Map<string, GitRepositoryFolder>());
  const [removeConfirmation, setRemoveConfirmation] = useState("");

  useEffect(() => {
    for (const config of state.configs)
      for (const folder of config.folders) mappings.current.set(`${config.id}:${folder.notebookId}`, folder);
  }, [state.configs]);
  const config = adding ? undefined : (state.configs.find((item) => item.id === selectedId) ?? state.configs[0]);
  const { checks: folderChecks, recheck } = useGitFolderChecks(bridge, visible && Boolean(config || adding), [
    ...localNotebooks.map((notebook) => notebook.localPath!),
    ...(config?.folders ?? []).map((folder) => folder.localPath),
  ]);

  const id = config?.id ?? newId;
  const draft = drafts[id] ?? config ?? emptyDraft();
  const folders = folderDrafts[id] ?? config?.folders ?? [];
  const status = state.statuses.find((item) => item.repositoryId === id);
  const pending = busy[id];
  const syncing = status?.phase === "syncing";
  const disabled = loading || Boolean(loadError) || Boolean(pending) || syncing;
  const selectionDisabled =
    loading || Boolean(loadError) || Boolean(pending && pending !== "保存选择并同步" && pending !== "自动保存设置");
  const checking = (repositoryId: string) =>
    busy[repositoryId] === "检查可见性" ||
    state.configs.find((item) => item.id === repositoryId)?.visibility.reason === "正在检查";
  const updateDraft = <K extends keyof GitDraft>(key: K, value: GitDraft[K]) => {
    setErrors((current) => ({ ...current, [id]: "" }));
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...draft,
        [key]: value,
        ...(key === "remoteUrl"
          ? { provider: String(value).includes("gitee.com") ? ("gitee" as const) : ("github" as const) }
          : {}),
      },
    }));
  };

  async function run(
    repositoryId: string,
    label: string,
    operation: () => Promise<GitSyncState>,
    onSuccess?: () => void,
  ) {
    if (!bridge || locks.current.has(repositoryId)) return;
    locks.current.add(repositoryId);
    setBusy((current) => ({ ...current, [repositoryId]: label }));
    setErrors((current) => ({ ...current, [repositoryId]: "" }));
    try {
      setState(await operation());
      onSuccess?.();
    } catch (error) {
      setErrors((current) => ({ ...current, [repositoryId]: `${label}失败：${messageOf(error)}` }));
    } finally {
      locks.current.delete(repositoryId);
      setBusy((current) => ({ ...current, [repositoryId]: "" }));
    }
  }
  const validate = (input: GitRepositoryInput) => validateRepositoryInput(input, state.configs);
  // Snapshot identity prevents an older save from discarding a newer selection.
  useEffect(() => {
    clearTimeout(saveTimers.current.get(id));
    if (!bridge || !config || (!drafts[id] && !folderDrafts[id]) || locks.current.has(id) || syncing || errors[id])
      return;
    if (!Number.isInteger(draft.intervalMinutes) || draft.intervalMinutes < 1 || draft.intervalMinutes > 1440) return;
    const draftSnapshot = drafts[id];
    const folderSnapshot = folderDrafts[id];
    const timer = setTimeout(() => {
      void run(
        id,
        folderSnapshot ? "保存选择并同步" : "自动保存设置",
        () => bridge.save(validate({ ...config, ...draft, folders })),
        () => {
          setDrafts((current) => {
            if (current[id] !== draftSnapshot) return current;
            const next = { ...current };
            delete next[id];
            return next;
          });
          setFolderDrafts((current) => {
            if (current[id] !== folderSnapshot) return current;
            const next = { ...current };
            delete next[id];
            return next;
          });
        },
      );
    }, 600);
    saveTimers.current.set(id, timer);
    // Derived snapshots update together; per-repository timers survive switching repositories.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridge, config, id, drafts, folderDrafts, busy, syncing, errors]);

  function connect() {
    if (!bridge || disabled) return;
    if (!folders.length) {
      setErrors((current) => ({ ...current, [id]: "请先选择至少一个同步文件夹" }));
      return;
    }
    void run(
      id,
      "连接并同步",
      () => bridge.save(validate({ id, ...draft, layout: "subfolders", folders })),
      () => {
        setDrafts((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
        setFolderDrafts((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
        setSelectedId(id);
        setAdding(false);
        setNewId(crypto.randomUUID());
      },
    );
  }
  function toggleFolder(folder: GitRepositoryFolder, checked: boolean) {
    if (
      !bridge ||
      selectionDisabled ||
      (checked && (!folderChecks[folder.localPath] || folderChecks[folder.localPath].error))
    )
      return;
    setErrors((current) => ({ ...current, [id]: "" }));
    const key = `${id}:${folder.notebookId}`;
    const mapping = mappings.current.get(key) ?? {
      ...folder,
      remotePath: config?.layout === "legacy-root" ? "" : newRemotePath(folder.name),
    };
    mappings.current.set(key, mapping);
    setFolderDrafts((current) => {
      const latest = current[id] ?? config?.folders ?? [];
      return {
        ...current,
        [id]: checked
          ? [...latest.filter((item) => item.notebookId !== folder.notebookId), mapping]
          : latest.filter((item) => item.notebookId !== folder.notebookId),
      };
    });
  }
  function checkVisibility(clear = false) {
    if (!bridge || !config || disabled) return;
    const token = tokens[id]?.trim();
    setTokens((current) => ({ ...current, [id]: "" }));
    void run(id, "检查可见性", () =>
      bridge.checkVisibility({ repositoryId: id, ...(clear ? { token: null } : token ? { token } : {}) }),
    );
  }
  async function recoverFolder(folder: GitRepositoryFolder, relocate: boolean) {
    if (!bridge || !config || disabled || folderDrafts[id] || drafts[id]) return;
    const localPath = await selectRecoveryPath(folder, relocate).catch((error) => {
      setErrors((current) => ({ ...current, [id]: messageOf(error) }));
      return null;
    });
    if (!localPath) return;
    void run(
      id,
      relocate ? "重新关联文件夹" : "重新打开文件夹",
      () =>
        rebindOpenedFolder(
          bridge,
          id,
          folder,
          localPath,
          relocate,
          config.folders.some((item) => item.notebookId === folder.notebookId),
        ),
      recheck,
    );
  }

  async function locateFolder(folder: GitRepositoryFolder) {
    try {
      await getGooseDesktop()?.showItemInFolder(folderChecks[folder.localPath]?.path ?? folder.localPath);
    } catch (error) {
      setErrors((current) => ({ ...current, [id]: messageOf(error) }));
    }
  }
  const rows: GitRepositoryFolder[] = localNotebooks.map(
    (notebook) =>
      config?.folders.find((folder) => folder.notebookId === notebook.id) ?? {
        notebookId: notebook.id,
        localPath: notebook.localPath!,
        name: notebook.name,
        remotePath: "",
      },
  );
  for (const folder of config?.folders ?? [])
    if (!rows.some((row) => row.notebookId === folder.notebookId)) rows.push(folder);
  const availableIds = availableFolderIds(localNotebooks, config?.folders ?? []);
  const selectedFolderError = folders.some(
    (folder) => !availableIds.has(folder.notebookId) || Boolean(folderChecks[folder.localPath]?.error),
  );
  const summary = gitSyncSummary(status, pending, selectedFolderError, folders.length, Boolean(config?.enabled));

  return (
    <GitSyncContent
      bridge={bridge}
      state={state}
      config={config}
      id={id}
      loading={loading}
      loadError={loadError}
      adding={adding}
      disabled={disabled}
      selectionDisabled={selectionDisabled}
      status={status}
      summary={summary}
      rows={rows}
      folders={folders}
      availableIds={availableIds}
      folderChecks={folderChecks}
      draft={draft}
      token={tokens[id] ?? ""}
      error={errors[id] ?? ""}
      unsavedFolders={Boolean(folderDrafts[id])}
      unsavedSettings={Boolean(drafts[id])}
      removeConfirmation={removeConfirmation}
      checking={checking}
      setRemoveConfirmation={setRemoveConfirmation}
      updateDraft={updateDraft}
      run={run}
      toggleFolder={toggleFolder}
      recoverFolder={recoverFolder}
      locateFolder={locateFolder}
      connect={connect}
      checkVisibility={checkVisibility}
      onToken={(value) => setTokens((current) => ({ ...current, [id]: value }))}
      onAdd={() => {
        setAdding(true);
        setRemoveConfirmation("");
      }}
      onSelect={(value) => {
        setSelectedId(value);
        setAdding(false);
        setRemoveConfirmation("");
      }}
      onReload={reload}
      onCancel={() => setAdding(false)}
      onRemoved={() => {
        setRemoveConfirmation("");
        setSelectedId("");
        setNewId(crypto.randomUUID());
      }}
      onFolderCheck={recheck}
    />
  );
}
