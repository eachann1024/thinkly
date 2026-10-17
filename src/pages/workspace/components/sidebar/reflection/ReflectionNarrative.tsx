import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";
import * as GooseIcons from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import type { ReflectionReport } from "@/stores/useReflection";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/reflection/ReflectionNarrative.tsx#localMessages:1">`
zh-Hans:
  nextStep: "下一步"
  generating: "正在生成…"
  failed: "生成失败，可点击右上角重新生成"
  consent: "开启后，会把范围内笔记的标题和摘要发送给当前配置的 AI 来生成反思。"
  enable: "开启"
  notConfigured: "尚未配置 AI。在设置中配置后即可生成反思。"
en:
  nextStep: "Next"
  generating: "Generating…"
  failed: "Generation failed. Use the button at the top right to retry."
  consent: "When enabled, the titles and excerpts of the notes in this range are sent to your configured AI to write the reflection."
  enable: "Enable"
  notConfigured: "AI is not configured. Set it up in Settings to generate a reflection."
`;
const uiText = createTranslator(localMessages);

export type NarrativeState = "notConfigured" | "needsConsent" | "generating" | "failed" | "ready";

interface Props {
  state: NarrativeState;
  report?: ReflectionReport;
  onEnable: () => void;
}

export function ReflectionNarrative({ state, report, onEnable }: Props) {
  useLocale();
  if (state === "notConfigured") return <p className="text-sm text-muted-foreground">{uiText("notConfigured")}</p>;
  if (state === "needsConsent") {
    return (
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-foreground">{uiText("consent")}</p>
        <Button size="sm" onClick={onEnable}>{uiText("enable")}</Button>
      </div>
    );
  }
  if (report) {
    return (
      <div>
        <h3 className="text-xl font-semibold leading-snug text-foreground">{report.title}</h3>
        {report.themes?.length ? (
          <>
            <ul className="mt-4 space-y-3.5">
              {report.themes.map((theme) => (
                <li key={theme.name}>
                  <div className="text-xs font-medium text-muted-foreground">{theme.name}</div>
                  <p className="mt-1 text-sm leading-relaxed text-foreground">{theme.point}</p>
                </li>
              ))}
            </ul>
            {report.suggestion ? (
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
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
  if (state === "generating") {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <GooseIcons.Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        {uiText("generating")}
      </p>
    );
  }
  return state === "failed" ? <p className="text-sm text-muted-foreground">{uiText("failed")}</p> : null;
}
