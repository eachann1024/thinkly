import { Sparkles } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/stores/useSettings";
import { isRetryableAvailabilityError } from "@/lib/notebook-ai/availabilityError";

/** 极简空态：不暴露服务端错误与凭证，仅给出原因和下一步。 */
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
  const hydrated = useSettings((state) => state._hasHydrated);
  const enabled = useSettings((state) => state.ai.enabled);
  const retryable = isRetryableAvailabilityError(error);
  const needsModel = reason?.includes("选择一个模型");
  const title = !hydrated
    ? "正在读取 AI 设置"
    : !enabled
      ? "AI 助手已关闭"
      : needsModel ? "尚未选择模型" : "AI 暂不可用";
  const canRetry = retryable && enabled;
  const openSettings = () => window.dispatchEvent(
    new CustomEvent("goose-note:open-settings", { detail: { tab: "ai" } }),
  );
  return (
    <section className={`flex shrink-0 items-center justify-center px-5 ${compact ? "py-4" : "min-h-0 flex-1 py-8"}`} aria-label="AI 状态">
      <EmptyState icon={Sparkles} title={title}
        details={hydrated && enabled && !needsModel && reason
          ? reason.startsWith("构造") ? "请在 AI 设置检查服务与模型。" : reason
          : undefined}
        action={hydrated ? (
          <Button contentStyle="preserve" variant="ghost" size={null} type="button"
            className="rounded-lg px-2 py-1 text-xs text-foreground"
            onClick={canRetry ? onRetry : openSettings}>
            {canRetry ? "重试" : "设置 AI"}
          </Button>
        ) : undefined} />
    </section>
  );
}
