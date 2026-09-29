import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SettingsSectionCard } from "./SettingsSectionCard";
import { DEFAULT_GIT_SYNC_INTERVAL, type GitSyncBridge, type GitSyncConfig, type GitSyncState } from "@/lib/git-sync-contract";
import { useNotebooks } from "@/stores/useNotebooks";

type Draft = Omit<GitSyncConfig, "notebookId" | "localPath">;

const EMPTY_DRAFT: Draft = {
  provider: "github",
  remoteUrl: "",
  branch: "main",
  intervalMinutes: DEFAULT_GIT_SYNC_INTERVAL,
  enabled: true,
};

function getGitSyncBridge(): GitSyncBridge | undefined {
  const desktop = (window as Window & { gooseDesktop?: { gitSync?: GitSyncBridge } }).gooseDesktop;
  return desktop?.gitSync;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error || "操作失败，请稍后重试");
}

export function SettingsGitSync() {
  const notebooks = useNotebooks((state) => state.notebooks);
  const activeNotebookId = useNotebooks((state) => state.activeNotebookId);
  const localNotebooks = useMemo(
    () => Object.values(notebooks).filter((notebook) => notebook.source === "local-folder" && notebook.localPath),
    [notebooks],
  );
  const [selectedId, setSelectedId] = useState("");
  const selectedIdRef = useRef(selectedId);
  const [bridge] = useState(getGitSyncBridge);
  const [state, setState] = useState<GitSyncState>({ configs: [], statuses: [] });
  const [editedDraft, setEditedDraft] = useState<{ key: string; value: Draft } | null>(null);
  const [loading, setLoading] = useState(Boolean(bridge));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bridge) return;
    let mounted = true;
    const applyState = (next: GitSyncState) => {
      if (mounted) setState(next);
    };
    const unsubscribe = bridge.onState(applyState);
    bridge.getState().then(applyState).catch((reason: unknown) => {
      if (mounted) setError(`读取 Git 同步状态失败：${errorMessage(reason)}`);
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [bridge]);

  const effectiveSelectedId = localNotebooks.some((item) => item.id === selectedId)
    ? selectedId
    : (localNotebooks.find((item) => item.id === activeNotebookId)?.id ?? localNotebooks[0]?.id ?? "");
  const selectedNotebook = localNotebooks.find((item) => item.id === effectiveSelectedId);
  useEffect(() => { selectedIdRef.current = effectiveSelectedId; }, [effectiveSelectedId]);
  const config = state.configs.find((item) => item.notebookId === effectiveSelectedId);
  const status = state.statuses.find((item) => item.notebookId === effectiveSelectedId);

  const draftKey = JSON.stringify([effectiveSelectedId, config?.provider, config?.remoteUrl, config?.branch, config?.intervalMinutes, config?.enabled]);
  const draft: Draft = editedDraft?.key === draftKey ? editedDraft.value : config ?? EMPTY_DRAFT;
  const updateDraft = useCallback(<K extends keyof Draft>(key: K, value: Draft[K]) => {
    setEditedDraft({ key: draftKey, value: { ...draft, [key]: value } });
  }, [draft, draftKey]);

  const runOperation = async (operation: () => Promise<GitSyncState>, failurePrefix: string) => {
    if (!bridge || !selectedNotebook || busy) return;
    const operationNotebookId = selectedNotebook.id;
    setBusy(true);
    setError("");
    try {
      const nextState = await operation();
      setState(nextState);
    } catch (reason) {
      if (selectedIdRef.current === operationNotebookId) setError(`${failurePrefix}：${errorMessage(reason)}`);
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!bridge || !selectedNotebook) return;
    const nextConfig: GitSyncConfig = {
      notebookId: selectedNotebook.id,
      localPath: selectedNotebook.localPath!,
      ...draft,
      intervalMinutes: Number(draft.intervalMinutes),
    };
    void runOperation(() => bridge.save(nextConfig), "保存配置失败");
  };

  const remove = () => {
    if (!bridge || !selectedNotebook) return;
    void runOperation(() => bridge.remove(selectedNotebook.id), "断开配置失败");
  };

  const syncNow = () => {
    if (!bridge || !selectedNotebook) return;
    void runOperation(() => bridge.syncNow(selectedNotebook.id), "立即同步失败");
  };

  if (!bridge) {
    return (
      <div className="space-y-5">
        <h3 className="text-xl font-semibold tracking-tight text-foreground">Git 同步</h3>
        <SettingsSectionCard>
          <p className="text-sm text-muted-foreground">Git 同步仅在桌面版应用中可用。</p>
        </SettingsSectionCard>
      </div>
    );
  }

  const disabled = busy || loading || state.statuses.some((item) => item.phase === "syncing") || !selectedNotebook;
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xl font-semibold tracking-tight text-foreground">Git 同步</h3>
        <p className="mt-1 text-sm text-muted-foreground">为每个本地记事本单独配置 SSH 仓库。</p>
      </div>
      <SettingsSectionCard title="同步配置">
        {localNotebooks.length ? (
          <div className="space-y-2">
            <Label htmlFor="git-sync-notebook">本地记事本</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button id="git-sync-notebook" type="button" variant="outline" disabled={busy || loading} className="w-full justify-between border-input px-3 font-normal text-foreground"><span className="truncate">{selectedNotebook?.name ?? "选择记事本"}</span><ChevronDown aria-hidden="true" className="text-muted-foreground" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" aria-label="本地记事本" className="min-w-[var(--trigger-width)]">
                <DropdownMenuRadioGroup value={effectiveSelectedId} onValueChange={(value) => { setSelectedId(value); setError(""); }}>
                  {localNotebooks.map((notebook) => <DropdownMenuRadioItem key={notebook.id} value={notebook.id}>{notebook.name}</DropdownMenuRadioItem>)}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : <p className="text-sm text-muted-foreground">尚无本地文件夹记事本。请先添加一个本地记事本。</p>}
        {selectedNotebook && <>
          <div className="space-y-2">
            <Label htmlFor="git-sync-provider">Git 平台</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button id="git-sync-provider" type="button" variant="outline" disabled={disabled} className="w-full justify-between border-input px-3 font-normal text-foreground"><span className="truncate">{draft.provider === "github" ? "GitHub" : "Gitee"}</span><ChevronDown aria-hidden="true" className="text-muted-foreground" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" aria-label="Git 平台" className="min-w-[var(--trigger-width)]">
                <DropdownMenuRadioGroup value={draft.provider} onValueChange={(value) => updateDraft("provider", value as Draft["provider"])}>
                  <DropdownMenuRadioItem value="github">GitHub</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="gitee">Gitee</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="space-y-2">
            <Label htmlFor="git-sync-remote">SSH 仓库地址</Label>
            <Input id="git-sync-remote" value={draft.remoteUrl} disabled={disabled} onChange={(event) => updateDraft("remoteUrl", event.target.value)} placeholder={draft.provider === "github" ? "git@github.com:用户名/仓库.git" : "git@gitee.com:用户名/仓库.git"} autoComplete="off" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="git-sync-branch">分支</Label>
            <Input id="git-sync-branch" value={draft.branch} disabled={disabled} onChange={(event) => updateDraft("branch", event.target.value)} placeholder="main" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="git-sync-interval">自动同步间隔（分钟）</Label>
            <Input id="git-sync-interval" type="number" min={1} max={1440} step={1} value={draft.intervalMinutes} disabled={disabled} onChange={(event) => updateDraft("intervalMinutes", Number(event.target.value))} />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/50 p-4">
            <div><Label htmlFor="git-sync-enabled" className="cursor-pointer">自动同步</Label><p className="mt-1 text-xs text-muted-foreground">应用运行期间按设定间隔同步整个记事本文件夹。</p></div>
            <Switch id="git-sync-enabled" checked={draft.enabled} disabled={disabled} onCheckedChange={(checked) => updateDraft("enabled", checked)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={save} disabled={disabled}>保存配置</Button>
            <Button type="button" variant="outline" onClick={syncNow} disabled={disabled || !config}>立即同步</Button>
            <Button type="button" variant="outline" onClick={remove} disabled={disabled || !config}>断开配置</Button>
          </div>
        </>}
      </SettingsSectionCard>
      <SettingsSectionCard title="连接与安全说明">
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>请使用私有仓库；应用无法验证仓库是否为私有。</li>
          <li>需要本机已安装 Git，并已将 SSH 公钥添加到 GitHub 或 Gitee。</li>
          <li>首次通过终端连接平台时，请先完成 SSH 主机信任确认；加密私钥需要由 SSH agent 解锁。</li>
          <li>应用运行期间会在后台同步整个记事本文件夹。成功同步不会弹出通知，异常时会发送系统通知。</li>
        </ul>
      </SettingsSectionCard>
      <SettingsSectionCard title="同步状态">
        {loading ? <p className="text-sm text-muted-foreground">正在读取同步状态…</p> : !selectedNotebook ? <p className="text-sm text-muted-foreground">选择一个本地记事本以查看状态。</p> : <div className="space-y-2 text-sm">
          <p>状态：<span className="text-muted-foreground">{status?.phase === "syncing" ? "同步中" : status?.phase === "error" ? "异常" : config ? "已连接" : "未配置"}</span></p>
          <p>上次成功：<span className="text-muted-foreground">{status?.lastSyncedAt ? new Date(status.lastSyncedAt).toLocaleString() : "尚无记录"}</span></p>
          {(status?.error || error) && <p role="alert" className="break-words text-destructive">{error || status?.error}</p>}
        </div>}
      </SettingsSectionCard>
      {error && (!selectedNotebook || loading) && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
