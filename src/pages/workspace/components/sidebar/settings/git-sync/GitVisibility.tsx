import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GitRepositoryConfig } from "@/lib/git-sync-contract";
import { SettingsSectionCard } from "../SettingsSectionCard";

export function VisibilityBadge({ config, checking }: { config: GitRepositoryConfig; checking: boolean }) {
  const value = config.visibility.value;
  const tone = value === "private" ? "success" : value === "public" ? "warning" : null;
  return (
    <Badge
      variant="outline"
      className="shrink-0 text-muted-foreground"
      style={
        tone
          ? {
              borderColor: `var(--goose-interactive-${tone}-border)`,
              backgroundColor: `var(--goose-interactive-${tone})`,
              color: `var(--goose-interactive-${tone}-fg)`,
            }
          : undefined
      }
    >
      {checking
        ? "检查中…"
        : value === "private"
          ? "上次确认私有"
          : value === "public"
            ? "公开 · 注意隐私"
            : "隐私未确认"}
    </Badge>
  );
}

export function GitVisibility({
  config,
  checking,
  disabled,
  token,
  onToken,
  onCheck,
}: {
  config: GitRepositoryConfig;
  checking: boolean;
  disabled: boolean;
  token: string;
  onToken: (value: string) => void;
  onCheck: (clear?: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [now] = useState(() => Date.now());
  const stale = !config.visibility.checkedAt || now - Date.parse(config.visibility.checkedAt) > 86_400_000;
  return (
    <SettingsSectionCard>
      <div className="flex flex-wrap items-center gap-2">
        <VisibilityBadge config={config} checking={checking} />
        <span className="flex-1 text-xs text-muted-foreground">
          {config.visibility.value === "unknown" && config.visibility.checkedAt ? "不影响 SSH 同步 · " : ""}
          {config.visibility.checkedAt
            ? `${stale ? "结果可能已变化 · " : ""}${new Date(config.visibility.checkedAt).toLocaleString()}`
            : "不影响 SSH 同步"}
        </span>
        <Button variant="ghost" size="sm" disabled={disabled} onClick={() => onCheck()}>
          检查隐私
        </Button>
        <Button variant="ghost" size="sm" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          {expanded ? "收起" : "检查凭据"}
        </Button>
      </div>
      {config.visibility.value === "public" && (
        <p className="text-sm text-danger">仓库公开，推送的笔记可能被任何人阅读。请在平台改为私有后重新检查。</p>
      )}
      {expanded && (
        <div className="space-y-3">
          <p className="break-words text-sm text-muted-foreground">
            {config.visibility.reason || "凭据仅检查仓库隐私，不用于同步笔记。"}
          </p>
          <div className="space-y-2">
            <Label htmlFor="git-sync-token">API Token（可选）</Label>
            <Input
              id="git-sync-token"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={token}
              disabled={disabled}
              onChange={(event) => onToken(event.target.value)}
              placeholder={config.hasToken ? "已安全保存，留空复用" : "需要读取仓库元数据的权限"}
            />
            <p className="text-xs text-muted-foreground">
              凭据由本机凭据库加密保存，检查后输入框清空；笔记始终通过 SSH 同步。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={disabled} onClick={() => onCheck()}>
              检查并保存凭据
            </Button>
            {config.hasToken && (
              <Button variant="ghost" disabled={disabled} onClick={() => onCheck(true)}>
                清除凭据
              </Button>
            )}
          </div>
        </div>
      )}
    </SettingsSectionCard>
  );
}
