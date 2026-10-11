import { useEffect, useState } from "react";
import { LoaderCircle } from "@/components/ui/icons";
import { formatLoaderElapsed } from "../beautifulUiMap";

// 兼容调用方的名称，所有进度统一使用一个轻量符号。
export type LoaderVariant = "Drive" | "Dots" | "Orbit";

export function LoadingState({
  label = "处理中",
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
    <div role="status" aria-label={label || "处理中"}
      className={compact ? "bui-loader bui-loader--compact" : "bui-loader"}>
      <LoaderCircle className="h-4 w-4 shrink-0 motion-safe:animate-spin" strokeWidth={1.5} aria-hidden="true" />
      {label && <span className="bui-loader-label">{label}</span>}
      {showElapsed && !compact && (
        <span className="bui-loader-elapsed">{formatLoaderElapsed(controlled ? elapsedMs : tickMs)}</span>
      )}
    </div>
  );
}
