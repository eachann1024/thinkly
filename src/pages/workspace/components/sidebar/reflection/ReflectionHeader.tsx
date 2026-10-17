import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";
import * as GooseIcons from "@/components/ui/icons";
import { IconButton } from "@/components/ui/icon-button";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { REFLECTION_SCOPES, type ReflectionScope } from "@/lib/reflection/scopeRange";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/reflection/ReflectionHeader.tsx#localMessages:1">`
zh-Hans:
  range: "时间范围"
  refresh: "重新读取并生成"
  scope7d: "过去 7 天"
  scope30d: "过去 1 个月"
  scope90d: "过去 3 个月"
en:
  range: "Time range"
  refresh: "Reload and regenerate"
  scope7d: "Past 7 days"
  scope30d: "Past 1 month"
  scope90d: "Past 3 months"
ja:
  range: "期間"
  refresh: "再読み込みして再生成"
  scope7d: "過去 7 日間"
  scope30d: "過去 1 か月"
  scope90d: "過去 3 か月"
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" aria-label={uiText("range")}
            className="min-w-32 justify-between font-normal">
            <span className="truncate">{uiText(`scope${scope}` as "scope7d")}</span>
            <GooseIcons.ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-32">
          <DropdownMenuRadioGroup value={scope} onValueChange={(value) => onScopeChange(value as ReflectionScope)}>
            {REFLECTION_SCOPES.map((value) => (
              <DropdownMenuRadioItem key={value} value={value}>
                {uiText(`scope${value}` as "scope7d")}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
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
