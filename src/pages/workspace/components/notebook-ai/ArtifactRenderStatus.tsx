import { Button } from "@/components/ui/button";
import { CircleAlert, LoaderCircle, RotateCcw } from "@/components/ui/icons";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/ArtifactRenderStatus.tsx#messages:1">`
zh-Hans:
  loading: "正在生成"
  failed: "生成失败"
  retry: "重试"
en:
  loading: "Generating"
  failed: "Generation failed"
  retry: "Retry"
ja:
  loading: "生成中"
  failed: "生成に失敗しました"
  retry: "再試行"
`;
const t = createTranslator(messages);
export function ArtifactRenderStatus({ failed, onRetry }: { failed?: boolean; onRetry: () => void }) {
  useLocale();
  const Icon = failed ? CircleAlert : LoaderCircle;
  return <div className="notebook-ai-artifact-render-status" role="status">
    <Icon size={16} className={failed ? undefined : "animate-spin motion-reduce:animate-none"} />
    <span>{t(failed ? "failed" : "loading")}</span>
    {failed ? <Button variant="ghost" size="sm" onClick={onRetry}><RotateCcw size={16} />{t("retry")}</Button> : null}
  </div>;
}
