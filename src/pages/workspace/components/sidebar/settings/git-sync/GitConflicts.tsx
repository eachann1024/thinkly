import { useState } from "react";
import { Button } from "@/components/ui/button";
import type {
  GitSyncBridge,
  GitSyncConflict,
  GitSyncConflictDetail,
  GitConflictResolution,
} from "@/lib/git-sync-contract";

export function GitConflicts({
  repositoryId,
  conflicts,
  bridge,
  disabled,
  onResolve,
}: {
  repositoryId: string;
  conflicts: GitSyncConflict[];
  bridge: GitSyncBridge;
  disabled: boolean;
  onResolve: (request: GitConflictResolution) => void;
}) {
  const [detail, setDetail] = useState<GitSyncConflictDetail | null>(null);
  const [loadingId, setLoadingId] = useState("");
  const [error, setError] = useState("");
  async function inspect(conflictId: string) {
    setLoadingId(conflictId);
    setError("");
    try {
      setDetail(await bridge.getConflict(repositoryId, conflictId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法读取冲突内容");
    } finally {
      setLoadingId("");
    }
  }
  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <p className="text-sm font-medium">有 {conflicts.length} 个文件需要决定保留内容；处理完成后会继续同步。</p>
      {conflicts.map((conflict) => (
        <div key={conflict.id} className="space-y-2 rounded-lg bg-muted/50 p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 break-all text-sm">
              {conflict.folderName} / {conflict.path}
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled || Boolean(loadingId)}
              onClick={() => void inspect(conflict.id)}
            >
              {loadingId === conflict.id ? "读取中…" : "查看双方内容"}
            </Button>
          </div>
          {detail?.id === conflict.id && (
            <div className="space-y-3">
              {detail.binary ? (
                <p className="text-sm leading-relaxed text-muted-foreground">此文件无法显示文字预览，可以选择保留版本。</p>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {(
                    [
                      ["本地内容", detail.localText],
                      ["远端内容", detail.remoteText],
                    ] as const
                  ).map(([label, content]) => (
                    <div key={label} className="min-w-0">
                      <p className="mb-1 text-xs font-medium">{label}</p>
                      <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-background p-2 text-xs">
                        {content ?? "此版本已删除文件"}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
              {detail.truncated && (
                <p className="text-sm leading-relaxed text-muted-foreground">内容过长，预览仅显示开头；选择会保留完整文件。</p>
              )}
              <p className="text-sm leading-relaxed text-muted-foreground">
                保留本地将覆盖远端{!conflict.localExists ? "并删除文件" : "内容"}；保留远端将覆盖本地
                {!conflict.remoteExists ? "并删除文件" : "内容"}。保留两份会另存远端版本。
              </p>
              <div className="flex flex-wrap gap-2">
                {(["local", "remote", "both"] as const).map((choice) => (
                  <Button
                    key={choice}
                    size="sm"
                    variant="outline"
                    disabled={disabled || (choice === "both" && (!conflict.localExists || !conflict.remoteExists))}
                    onClick={() => {
                      setDetail(null);
                      onResolve({ repositoryId, conflictId: conflict.id, choice });
                    }}
                  >
                    {choice === "local"
                      ? conflict.localExists
                        ? "保留本地"
                        : "按本地删除"
                      : choice === "remote"
                        ? conflict.remoteExists
                          ? "保留远端"
                          : "按远端删除"
                        : "保留两份"}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
