import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/SettingsGitSync.tsx#localMessages:1">`
zh-Hans:
  saveSelectionAndSync_e9da: "保存选择并同步"
  savingSettingsAutomatically_a7dc: "自动保存设置"
  operationFailed: "{{action}}失败：{{error}}"
  selectAtLeastOneFolderTo_0e62: "请先选择至少一个同步文件夹"
  connectAndSync_9751: "连接并同步"
  restoreFolder_5b9e: "恢复文件夹"
en:
  saveSelectionAndSync_e9da: "Save selection and sync"
  savingSettingsAutomatically_a7dc: "Saving settings automatically"
  operationFailed: "{{action}} failed: {{error}}"
  selectAtLeastOneFolderTo_0e62: "Select at least one folder to sync"
  connectAndSync_9751: "Connect and sync"
  restoreFolder_5b9e: "Restore folder"
`;
const uiText = createTranslator(localMessages);
import { gitNotebookDirectory } from "@/lib/git-notebook-directory";
import { useGitSyncState } from "./git-sync/useGitSyncState";
import {
  gitSyncSummary,

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
import { folderPathKey, gitFolderRows, reconcileFolderSelection } from "./git-sync/gitFolderRows";

export function SettingsGitSync({ visible = true }: { visible?: boolean }) {
  const notebooks = useNotebooks((store) => store.notebooks);
  const localNotebooks = useMemo(
    () => Object.values(notebooks).filter((item) => item.source === "local-folder" && item.localPath),
    [notebooks],
  );
  const [bridge] = useState(
    () => (window as Window & { gooseDesktop?: { gitSync?: GitSyncBridge } }).gooseDesktop?.gitSync,
  );
  const { state, applyState, loading, loadError, reload } = useGitSyncState(bridge, visible);
  const [selectedId, setSelectedId] = useState("");
  const [newId, setNewId] = useState(() => crypto.randomUUID());
  const [adding, setAdding] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, GitDraft>>({});
  const [folderDrafts, setFolderDrafts] = useState<Record<string, GitRepositoryFolder[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, string>>({});
  const notebookRevision = JSON.stringify(localNotebooks.map(({ id, localPath, localPathMissing }) => [id, localPath, localPathMissing]));
  useEffect(() => setErrors({}), [notebookRevision]);
  const locks = useRef(new Set<string>());
  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const timers = saveTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);
  const [removeConfirmation, setRemoveConfirmation] = useState("");
  const config = adding ? undefined : (state.configs.find((item) => item.id === selectedId) ?? state.configs[0]);
  const { checks: folderChecks, recheck } = useGitFolderChecks(bridge, visible && Boolean(config || adding), [
    ...localNotebooks.map((notebook) => notebook.localPath!),
    ...(config?.folders ?? []).map((folder) => folder.localPath),
  ], notebookRevision);

  const id = config?.id ?? newId;
  const draft = drafts[id] ?? config ?? emptyDraft();
  const sourceFolders = folderDrafts[id] ?? config?.folders;
  const folders = useMemo(() => reconcileFolderSelection(sourceFolders ?? [], localNotebooks), [sourceFolders, localNotebooks]);
  const reconciledFolders = Boolean(sourceFolders && folders !== sourceFolders);
  const status = state.statuses.find((item) => item.repositoryId === id);
  const pending = busy[id];
  const syncing = status?.phase === "syncing";
  const disabled = loading || Boolean(loadError) || Boolean(pending) || syncing;
  const selectionDisabled =
    loading || Boolean(loadError) || Boolean(pending && pending !== uiText("saveSelectionAndSync_e9da") && pending !== uiText("savingSettingsAutomatically_a7dc"));
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
      applyState(await operation());
      onSuccess?.();
    } catch (error) {
      setErrors((current) => ({ ...current, [repositoryId]: uiText("operationFailed", { action: label, error: messageOf(error) }) }));
    } finally {
      locks.current.delete(repositoryId);
      setBusy((current) => ({ ...current, [repositoryId]: "" }));
    }
  }
  const validate = (input: GitRepositoryInput) => validateRepositoryInput(input, state.configs);
  // Snapshot identity prevents an older save from discarding a newer selection.
  useEffect(() => {
    clearTimeout(saveTimers.current.get(id));
    if (!bridge || !config || (!drafts[id] && !folderDrafts[id] && !reconciledFolders) || locks.current.has(id) || syncing || errors[id])
      return;
    if (!Number.isInteger(draft.intervalMinutes) || draft.intervalMinutes < 1 || draft.intervalMinutes > 1440) return;
    const draftSnapshot = drafts[id];
    const folderSnapshot = folderDrafts[id];
    const timer = setTimeout(() => {
      void run(
        id,
        folderSnapshot || reconciledFolders ? uiText("saveSelectionAndSync_e9da") : uiText("savingSettingsAutomatically_a7dc"),
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
  }, [bridge, config, id, drafts, folderDrafts, folders, reconciledFolders, busy, syncing, errors]);

  function connect() {
    if (!bridge || disabled) return;
    if (!folders.length) {
      setErrors((current) => ({ ...current, [id]: uiText("selectAtLeastOneFolderTo_0e62") }));
      return;
    }
    void run(
      id,
      uiText("connectAndSync_9751"),
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
    const mapping = {
      ...folder,
      remotePath: config?.layout === "legacy-root" ? "" : folder.remotePath || gitNotebookDirectory(folder.localPath),
    };
    setFolderDrafts((current) => {
      const latest = reconcileFolderSelection(current[id] ?? config?.folders ?? [], localNotebooks);
      return {
        ...current,
        [id]: checked
          ? [...latest.filter((item) => item.notebookId !== folder.notebookId), mapping]
          : latest.filter((item) => item.notebookId !== folder.notebookId),
      };
    });
  }
  async function recoverFolder(folder: GitRepositoryFolder, relocate: boolean) {
    if (!bridge || disabled) return;
    void run(
      id,
      uiText("restoreFolder_5b9e"),
      async () => {
        const localPath = await selectRecoveryPath(folder, relocate);
        if (!localPath) return bridge.getState();
        const original = config?.folders.find((item) => item.notebookId === folder.notebookId
          || folderPathKey(item.localPath) === folderPathKey(folder.localPath));
        const next = await rebindOpenedFolder(bridge, id, original ?? folder, localPath, relocate, Boolean(original));
        const replacement = next.configs.find((item) => item.id === id)?.folders.find((item) => item.remotePath === original?.remotePath);
        if (replacement) setFolderDrafts((current) => current[id] ? {
          ...current,
          [id]: current[id].map((item) => item.notebookId === folder.notebookId || item.notebookId === original?.notebookId ? replacement : item),
        } : current);
        return next;
      },
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
  const rows = gitFolderRows(localNotebooks, folders, state.mappingHistory?.[id] ?? config?.folders ?? []);
  const availableIds = availableFolderIds(localNotebooks, folders);
  const selectedFolderError = folders.filter(
    (folder) => !availableIds.has(folder.notebookId) || Boolean(folderChecks[folder.localPath]?.error),
  ).length;
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
      folderErrorCount={selectedFolderError}
      rows={rows}
      folders={folders}
      availableIds={availableIds}
      folderChecks={folderChecks}
      draft={draft}
      error={errors[id] ?? ""}
      unsavedFolders={Boolean(folderDrafts[id]) || reconciledFolders}
      unsavedSettings={Boolean(drafts[id])}
      removeConfirmation={removeConfirmation}
      setRemoveConfirmation={setRemoveConfirmation}
      updateDraft={updateDraft}
      run={run}
      toggleFolder={toggleFolder}
      recoverFolder={recoverFolder}
      locateFolder={locateFolder}
      connect={connect}
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
