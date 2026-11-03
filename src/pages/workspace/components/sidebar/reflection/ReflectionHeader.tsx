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
  busy: boolean;
  onScopeChange: (scope: ReflectionScope) => void;
  onRefresh: () => void;
}

export function ReflectionHeader({ scope, busy, onScopeChange, onRefresh }: Props) {
  useLocale();
  return (
    <>
      <div role="group" aria-label={uiText("range")} className="flex rounded-lg bg-muted p-0.5">
        {REFLECTION_SCOPES.map((value) => {
          const selected = value === scope;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              onClick={() => onScopeChange(value)}
              className={`h-[26px] rounded-md px-3 text-xs font-medium ${
                selected ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {uiText(`scope${value}` as "scope7d")}
            </button>
          );
        })}
      </div>
      <IconButton
        type="button"
        size="sm"
        tone="muted"
        busy={busy}
        disabled={busy}
        aria-label={uiText("refresh")}
        title={uiText("refresh")}
        onClick={onRefresh}
      >
        <GooseIcons.RefreshCw aria-hidden="true" className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
      </IconButton>
    </>
  );
}
