import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";
import * as GooseIcons from "@/components/ui/icons";
import { IconButton } from "@/components/ui/icon-button";
import { REFLECTION_SCOPES, type ReflectionScope } from "@/lib/reflection/scopeRange";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/reflection/ReflectionHeader.tsx#localMessages:1">`
zh-Hans:
  range: "时间范围"
  refresh: "重新读取并生成"
  scope7d: "7 天"
  scope30d: "30 天"
  scope90d: "90 天"
en:
  range: "Time range"
  refresh: "Reload and regenerate"
  scope7d: "7 days"
  scope30d: "30 days"
  scope90d: "90 days"
ja:
  range: "期間"
  refresh: "再読み込みして再生成"
  scope7d: "7日間"
  scope30d: "30日間"
  scope90d: "90日間"
`;
const uiText = createTranslator(localMessages);

interface Props {
  scope: ReflectionScope;
  rangeLabel: string;
  busy: boolean;
  onScopeChange: (scope: ReflectionScope) => void;
  onRefresh: () => void;
}

export function ReflectionHeader({ scope, rangeLabel, busy, onScopeChange, onRefresh }: Props) {
  useLocale();
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-5 border-b border-border px-6 py-3 max-[650px]:gap-2 max-[650px]:px-4 max-[650px]:py-3">
      <div role="group" aria-label={uiText("range")} className="flex rounded-lg bg-muted p-0.5">
        {REFLECTION_SCOPES.map((value) => {
          const selected = value === scope;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              onClick={() => onScopeChange(value)}
              className={`h-9 rounded-md border px-3.5 text-[13px] font-medium ${
                selected
                  ? "border-[var(--goose-accent-solid)] bg-card text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {uiText(`scope${value}` as "scope7d")}
            </button>
          );
        })}
      </div>
      <span className="goose-tabular whitespace-nowrap text-xs text-muted-foreground max-[400px]:order-last max-[400px]:w-full">
        {rangeLabel}
      </span>
      <IconButton
        type="button"
        size="sm"
        tone="muted"
        className="ml-auto"
        busy={busy}
        disabled={busy}
        aria-label={uiText("refresh")}
        title={uiText("refresh")}
        onClick={onRefresh}
      >
        <GooseIcons.RefreshCw aria-hidden="true" className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
      </IconButton>
    </div>
  );
}
