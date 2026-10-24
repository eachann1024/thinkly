import { useLocale } from "@/i18n";
import { Sparkles } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { DotDecor, DotIconArt, EmptyStateArt, type DotIconMotion } from "@/components/ui/dot-matrix";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/stores/useSettings";
import { isRetryableAvailabilityError } from "@/lib/notebook-ai/availabilityError";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/panel/AiUnavailableState.tsx#messages:1">`
zh-Hans:
  chooseAModel: "选择一个模型"
  loadingAiSettings: "正在读取 AI 设置"
  aiAssistantIsOff: "AI 助手已关闭"
  noModelSelected: "尚未选择模型"
  aiIsTemporarilyUnavailable: "AI 暂不可用"
  aiStatus: "AI 状态"
  checkTheServiceAndModelInAiSettings: "请在 AI 设置检查服务与模型。"
  retry: "重试"
  setUpAi: "设置 AI"
en:
  chooseAModel: "Choose a model"
  loadingAiSettings: "Loading AI settings"
  aiAssistantIsOff: "AI assistant is off"
  noModelSelected: "No model selected"
  aiIsTemporarilyUnavailable: "AI is temporarily unavailable"
  aiStatus: "AI status"
  checkTheServiceAndModelInAiSettings: "Check the service and model in AI settings."
  retry: "Retry"
  setUpAi: "Set up AI"
ja:
  chooseAModel: "モデルを選択"
  loadingAiSettings: "AI 設定を読み込み中"
  aiAssistantIsOff: "AI アシスタントはオフです"
  noModelSelected: "モデルが未選択です"
  aiIsTemporarilyUnavailable: "AI は現在利用できません"
  aiStatus: "AI の状態"
  checkTheServiceAndModelInAiSettings: "AI 設定でサービスとモデルを確認してください。"
  retry: "再試行"
  setUpAi: "AI を設定"
`;
const t = createTranslator(messages);


export function AiUnavailableState({
  reason,
  error,
  onRetry,
  compact = false,
}: {
  reason?: string;
  error?: Error;
  onRetry: () => void;
  compact?: boolean;
}) {
  useLocale();
  const hydrated = useSettings((state) => state._hasHydrated);
  const enabled = useSettings((state) => state.ai.enabled);
  const retryable = isRetryableAvailabilityError(error);
  const needsModel = /选择一个模型|choose a model/i.test(reason ?? "");
  const title = !hydrated
    ? t("loadingAiSettings")
    : !enabled
      ? t("aiAssistantIsOff")
      : needsModel ? t("noModelSelected") : t("aiIsTemporarilyUnavailable");
  const canRetry = retryable && enabled;
  const motion: DotIconMotion = !hydrated ? "progress" : enabled && !needsModel ? "alert" : "idle";
  const art = compact ? undefined
    : hydrated && !enabled ? <EmptyStateArt kind="assistantOff" className="-my-2" />
    : <DotIconArt icon="sparkleOff" size={52} width={136} height={96} halo motion={motion} className="-my-2" />;
  const openSettings = () => window.dispatchEvent(
    new CustomEvent("goose-note:open-settings", { detail: { tab: "ai" } }),
  );
  return (
    <section className={`relative flex shrink-0 items-center justify-center px-5 ${compact ? "py-4" : "min-h-0 flex-1 overflow-hidden py-8 [&>.goose-empty-state]:relative"}`} aria-label={t("aiStatus")}>
      {compact ? null : <DotDecor preset="aiOff" />}
      <EmptyState icon={Sparkles} illustration={art} title={title}
        details={hydrated && enabled && !needsModel && reason
          ? /^(构造|could not create .*model)/i.test(reason) ? t("checkTheServiceAndModelInAiSettings") : reason
          : undefined}
        action={hydrated ? (
          <Button contentStyle="preserve" variant="ghost" size={null} type="button"
            className="rounded-lg px-2 py-1 text-xs text-foreground"
            onClick={canRetry ? onRetry : openSettings}>
            {canRetry ? t("retry") : t("setUpAi")}
          </Button>
        ) : undefined} />
    </section>
  );
}
