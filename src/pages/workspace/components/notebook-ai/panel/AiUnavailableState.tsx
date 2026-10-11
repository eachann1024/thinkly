import { Sparkles } from "@/components/ui/icons";
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
  const description = needsModel
    ? "尚未选择可用模型，请前往 AI 设置完成配置。"
    : reason?.startsWith("构造")
      ? "AI 配置无法使用，请前往设置检查服务与模型。"
      : reason;
  const title = !hydrated
    ? "正在读取 AI 设置"
    : !enabled
      ? "AI 助手已关闭"
      : needsModel
        ? "连接你的 AI 助手"
        : "AI 暂不可用";
  return (
    <section
      className={`flex shrink-0 flex-col items-center justify-center px-6 text-center ${compact ? "gap-2 py-5" : "min-h-0 flex-1 gap-3 py-8"}`}
      aria-label="AI 状态"
      role="status"
    >
      {!compact ? (
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-[14px] bg-[var(--goose-interactive-hover)] text-muted-foreground">
          <Sparkles className="h-6 w-6" strokeWidth={1.5} aria-hidden />
        </div>
      ) : null}
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
      <p className="max-w-[260px] text-xs leading-relaxed text-muted-foreground">
        {!hydrated ? "设置读取完成后即可继续。" : description}
      </p>
      {hydrated ? (
        <>
          <Button
            type="button"
            size="sm"
            className="mt-2"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("goose-note:open-settings", {
                  detail: { tab: "ai" },
                }),
              )
            }
          >
            {!enabled ? "去开启 AI" : "去设置 AI"}
          </Button>
          {retryable ? (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            >
              返回对话重试
            </button>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
