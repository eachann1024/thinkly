import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";
import type { ReactNode } from "react";
import * as GooseIcons from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import type { ReflectionReport } from "@/stores/useReflection";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/reflection/ReflectionNarrative.tsx#localMessages:1">`
zh-Hans:
  nextStep: "下一步"
  generating: "正在生成本期反思…"
  failed: "生成失败：{{message}}"
  retry: "重新生成"
  consent: "开启后，会把范围内笔记的标题和摘要发送给当前配置的 AI 来生成反思。"
  enable: "开启"
  notConfigured: "尚未配置 AI。配置后即可生成反思，下面的统计不受影响。"
  openSettings: "打开 AI 设置"
en:
  nextStep: "Next"
  generating: "Writing this reflection…"
  failed: "Generation failed: {{message}}"
  retry: "Try again"
  consent: "When enabled, the titles and excerpts of the notes in this range are sent to your configured AI to write the reflection."
  enable: "Enable"
  notConfigured: "AI is not configured. Set it up to generate a reflection. The stats below stay available."
  openSettings: "Open AI settings"
ja:
  nextStep: "次のステップ"
  generating: "この期の振り返りを生成しています…"
  failed: "生成に失敗しました：{{message}}"
  retry: "再生成"
  consent: "オンにすると、期間内のノートのタイトルと要約が、設定済みの AI に送信され、振り返りの生成に使用されます。"
  enable: "オンにする"
  notConfigured: "AI が設定されていません。設定すると振り返りを生成できます。下の統計はそのまま使えます。"
  openSettings: "AI 設定を開く"
`;
const uiText = createTranslator(localMessages);

export type NarrativeState = "notConfigured" | "needsConsent" | "generating" | "failed" | "ready";

interface Props {
  state: NarrativeState;
  report?: ReflectionReport;
  failureMessage?: string;
  onEnable: () => void;
  onOpenSettings: () => void;
  onRetry: () => void;
}

function Banner({ tone, children }: { tone: "muted" | "danger"; children: ReactNode }) {
  return (
    <div
      role={tone === "danger" ? "alert" : undefined}
      className={`flex items-center gap-4 rounded-lg px-4 py-3.5 ${
        tone === "danger" ? "bg-[var(--goose-interactive-danger)]" : "bg-muted"
      }`}
    >
      {children}
    </div>
  );
}

export function ReflectionNarrative({ state, report, failureMessage, onEnable, onOpenSettings, onRetry }: Props) {
  useLocale();
  if (state === "notConfigured") {
    return (
      <Banner tone="muted">
        <p className="m-0 flex-1 text-sm leading-5 text-muted-foreground">{uiText("notConfigured")}</p>
        <Button type="button" variant="outline" size="sm" onClick={onOpenSettings}>{uiText("openSettings")}</Button>
      </Banner>
    );
  }
  if (state === "needsConsent") {
    return (
      <Banner tone="muted">
        <p className="m-0 flex-1 text-sm leading-5 text-foreground">{uiText("consent")}</p>
        <Button type="button" size="sm" onClick={onEnable}>{uiText("enable")}</Button>
      </Banner>
    );
  }
  if (state === "generating" && !report) {
    return (
      <div className="flex flex-col gap-3" aria-live="polite">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <GooseIcons.Loader2 aria-hidden="true" className="h-3 w-3 animate-spin text-[var(--goose-accent-solid)]" />
          {uiText("generating")}
        </span>
        <span className="h-[22px] w-[62%] rounded-md bg-muted" />
        <span className="h-3.5 w-[92%] rounded-md bg-muted" />
        <span className="h-3.5 w-[84%] rounded-md bg-muted" />
        <span className="h-3.5 w-[70%] rounded-md bg-muted" />
      </div>
    );
  }
  if (state === "failed" && !report) {
    return (
      <Banner tone="danger">
        <p className="m-0 flex-1 text-sm leading-5 text-danger">{uiText("failed", { message: failureMessage ?? "" })}</p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>{uiText("retry")}</Button>
      </Banner>
    );
  }
  if (!report) return null;
  return (
    <div>
      <h2 className="m-0 text-[22px] font-semibold leading-[30px] tracking-tight text-foreground">{report.title}</h2>
      {report.themes?.length ? (
        <>
          <ul className="mt-5 flex list-none flex-col gap-4 p-0">
            {report.themes.map((theme) => (
              <li key={theme.name}>
                <div className="text-xs font-medium text-muted-foreground">{theme.name}</div>
                <p className="mt-1 text-sm leading-[22px] text-foreground">{theme.point}</p>
              </li>
            ))}
          </ul>
          {report.suggestion ? (
            <p className="mt-3.5 rounded-lg bg-muted px-3.5 py-3 text-sm leading-[22px] text-muted-foreground">
              <span className="mr-1.5 font-medium text-foreground">{uiText("nextStep")}</span>
              {report.suggestion}
            </p>
          ) : null}
        </>
      ) : (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{report.body}</p>
      )}
    </div>
  );
}
