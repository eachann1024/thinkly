import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";
import { ReflectionReviewArt } from "@/components/ui/dot-matrix";
import { Button } from "@/components/ui/button";
import * as GooseIcons from "@/components/ui/icons";
import type { ReflectionRecordStatus } from "@/lib/reflection/reflectionRecord";
import type { ReflectionScope } from "@/lib/reflection/scopeRange";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/reflection/ReflectionRecordState.tsx#localMessages:1">`
zh-Hans:
  empty: "这段时间，还没有新的编辑"
  emptyHint: "试试扩大时间范围，回看更早的记录。"
  failed: "暂时无法读取编辑记录"
  failedHint: "重新读取后，再查看这段时间的反思。"
  loading: "正在读取编辑记录"
  look30: "查看最近 30 天"
  look90: "查看最近 90 天"
  reread: "重新读取"
  rereadRecords: "重新读取记录"
en:
  empty: "No new edits in this period"
  emptyHint: "Try a wider range to look further back."
  failed: "Edit history is unavailable"
  failedHint: "Reload, then open the reflection for this period."
  loading: "Reading edit history"
  look30: "View the last 30 days"
  look90: "View the last 90 days"
  reread: "Reload"
  rereadRecords: "Reload history"
ja:
  empty: "この期間に新しい編集はありません"
  emptyHint: "期間を広げて、より前の記録を見てください。"
  failed: "編集履歴を読み取れません"
  failedHint: "再読み込みしてから、この期間の振り返りを開いてください。"
  loading: "編集履歴を読み込んでいます"
  look30: "直近30日間を見る"
  look90: "直近90日間を見る"
  reread: "再読み込み"
  rereadRecords: "記録を再読み込み"
`;
const uiText = createTranslator(localMessages);

interface Props {
  status: Exclude<ReflectionRecordStatus, "ready"> | "empty";
  scope: ReflectionScope;
  rangeLabel: string;
  onScopeChange: (scope: ReflectionScope) => void;
  onReload: () => void;
}

export function ReflectionRecordState({ status, scope, rangeLabel, onScopeChange, onReload }: Props) {
  useLocale();
  const empty = status === "empty";
  const failed = status === "unavailable";
  const title = empty ? uiText("empty") : failed ? uiText("failed") : uiText("loading");
  const hint = empty ? uiText("emptyHint") : failed ? uiText("failedHint") : rangeLabel;
  const expand = scope === "7d" ? "30d" : scope === "30d" ? "90d" : null;
  return (
    <section
      aria-live="polite"
      className="mx-auto my-auto flex w-full max-w-[720px] shrink-0 items-center gap-11 px-8 py-12 max-[650px]:flex-col max-[650px]:gap-6 max-[650px]:text-center max-[400px]:px-5"
    >
      <ReflectionReviewArt className="shrink-0 text-muted-foreground" />
      <div className="flex max-w-[390px] flex-col">
        <h2 className="m-0 text-lg font-medium leading-7 text-foreground">{title}</h2>
        <p className="m-0 mt-3 text-[13px] leading-[22px] text-muted-foreground">{hint}</p>
        {empty ? (
          <div className="mt-6 flex items-center gap-3 max-[650px]:justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2.5"
              onClick={() => (expand ? onScopeChange(expand) : onReload())}
            >
              <span>{expand === "30d" ? uiText("look30") : expand === "90d" ? uiText("look90") : uiText("rereadRecords")}</span>
              <GooseIcons.ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onReload}>{uiText("reread")}</Button>
          </div>
        ) : null}
        {failed ? (
          <Button type="button" variant="outline" size="sm" className="mt-6 self-start max-[650px]:self-center" onClick={onReload}>
            {uiText("reread")}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
