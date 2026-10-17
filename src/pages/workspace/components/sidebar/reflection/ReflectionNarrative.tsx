import { createTranslator, i18nYaml } from "@/i18n";
import * as GooseIcons from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import type { ReflectionReport } from "@/stores/useReflection";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/reflection/ReflectionNarrative.tsx#localMessages:1">`
zh-Hans:
  refresh: "重新生成"
  generating: "正在生成…"
  failed: "生成失败，可点击右上角重新生成"
  consent: "开启后，会把上周笔记的标题和摘要发送给当前配置的 AI 来生成反思。"
  enable: "开启"
  notConfigured: "尚未配置 AI。在设置中配置后即可生成反思。"
  tooFew: "上周编辑较少，没有生成反思。"
en:
  refresh: "Regenerate"
  generating: "Generating…"
  failed: "Generation failed. Use the button at the top right to retry."
  consent: "When enabled, the titles and excerpts of last week's notes are sent to your configured AI to write the reflection."
  enable: "Enable"
  notConfigured: "AI is not configured. Set it up in Settings to generate a reflection."
  tooFew: "Not enough edits last week to write a reflection."
`;
const uiText = createTranslator(localMessages);

export type NarrativeState =
  | "tooFew"
  | "notConfigured"
  | "needsConsent"
  | "generating"
  | "failed"
  | "ready";

interface Props {
  state: NarrativeState;
  report?: ReflectionReport;
  onEnable: () => void;
  onRefresh: () => void;
}

export function ReflectionNarrative({ state, report, onEnable, onRefresh }: Props) {
  if (state === "tooFew") return <p className="text-sm text-muted-foreground">{uiText("tooFew")}</p>;
  if (state === "notConfigured") return <p className="text-sm text-muted-foreground">{uiText("notConfigured")}</p>;
  if (state === "needsConsent") {
    return (
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-foreground">{uiText("consent")}</p>
        <Button size="sm" onClick={onEnable}>{uiText("enable")}</Button>
      </div>
    );
  }
  const busy = state === "generating";
  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        {busy && !report ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <GooseIcons.Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            {uiText("generating")}
          </p>
        ) : null}
        {state === "failed" && !report ? (
          <p className="text-sm text-muted-foreground">{uiText("failed")}</p>
        ) : null}
        {report ? (
          <>
            <h2 className="text-lg font-semibold leading-snug text-foreground">{report.title}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{report.body}</p>
          </>
        ) : null}
      </div>
      <IconButton
        type="button"
        size="xs"
        tone="muted"
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
