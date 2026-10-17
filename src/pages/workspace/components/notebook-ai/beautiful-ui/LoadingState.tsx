import { useEffect, useState } from "react";
import { LoaderCircle } from "@/components/ui/icons";
import { formatLoaderElapsed } from "../beautifulUiMap";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/beautiful-ui/LoadingState.tsx#messages:1">`
zh-Hans:
  processing: "处理中"
en:
  processing: "Processing"
`;
const t = createTranslator(messages);


// 兼容调用方的名称，所有进度统一使用一个轻量符号。
export type LoaderVariant = "Drive" | "Dots" | "Orbit";

export function LoadingState({
  label = t("processing"),
  elapsedMs,
  compact = false,
  showElapsed = false,
}: {
  label?: string;
  variant?: LoaderVariant;
  elapsedMs?: number;
  compact?: boolean;
  showElapsed?: boolean;
}) {
  const [tickMs, setTickMs] = useState(0);
  const controlled = typeof elapsedMs === "number";
  const needsTimer = showElapsed && !compact && !controlled;

  useEffect(() => {
    if (!needsTimer) return;
    const started = Date.now();
    const timer = setInterval(() => setTickMs(Date.now() - started), 1000);
    return () => clearInterval(timer);
  }, [needsTimer]);

  return (
    <div role="status" aria-label={label || t("processing")}
      className={compact ? "bui-loader bui-loader--compact" : "bui-loader"}>
      <LoaderCircle className="h-4 w-4 shrink-0 motion-safe:animate-spin" strokeWidth={1.5} aria-hidden="true" />
      {label && <span className="bui-loader-label">{label}</span>}
      {showElapsed && !compact && (
        <span className="bui-loader-elapsed">{formatLoaderElapsed(controlled ? elapsedMs : tickMs)}</span>
      )}
    </div>
  );
}
