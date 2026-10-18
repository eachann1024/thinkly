import type { HTMLAttributes, ReactNode } from "react";
import { useDelayedFlag } from "@/hooks/useDelayedFlag";
import { cn } from "@/lib/utils";

// 固定宽度序列：每行长短错落，又不会在重渲染时跳动。
const TITLE_WIDTHS = [72, 48, 84, 60, 40, 78, 54, 66];
const SUBTITLE_WIDTHS = [36, 22, 42, 28, 18, 45, 30, 24];
const LINE_WIDTHS = [100, 96, 88, 100, 92, 64];

const widthAt = (widths: number[], index: number) => `${widths[index % widths.length]}%`;

/** 单个占位块：中性底色 + 横扫高光，形状由调用方 className 决定。 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span aria-hidden="true" {...props} className={cn("goose-skeleton", className)} />;
}

type DelayedProps = {
  /** 读屏播报的加载说明；不渲染为可见文字。 */
  label?: string;
  /** 挂载后多久才显示；快速加载在此之前结束就不会闪出骨架。 */
  delay?: number;
  className?: string;
};

function DelayedStatus({ label, delay = 180, children, ...props }: DelayedProps & HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  const shown = useDelayedFlag(true, delay);
  return (
    <div {...props} role="status" aria-busy="true" aria-label={label}>
      {shown && children}
    </div>
  );
}

/** 列表加载骨架：图标 + 标题条 + 可选副标题条，对应搜索结果、文件树等行。 */
export function SkeletonList({
  rows = 8,
  lines = 2,
  icon = true,
  density = "default",
  ...rest
}: DelayedProps & {
  rows?: number;
  lines?: 1 | 2;
  icon?: boolean;
  density?: "default" | "compact";
}) {
  return (
    <DelayedStatus {...rest} data-density={density} className={cn("goose-skeleton-list", rest.className)}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="goose-skeleton-row" data-lines={lines}>
          {icon && <Skeleton className="goose-skeleton-icon" />}
          <div className="goose-skeleton-text">
            <Skeleton className="goose-skeleton-title" style={{ width: widthAt(TITLE_WIDTHS, index) }} />
            {lines === 2 && <Skeleton className="goose-skeleton-subtitle" style={{ width: widthAt(SUBTITLE_WIDTHS, index) }} />}
          </div>
        </div>
      ))}
    </DelayedStatus>
  );
}

/** 正文加载骨架：标题条 + 若干段落行，对应笔记／历史版本正文。 */
export function SkeletonDocument({ lines = 6, ...rest }: DelayedProps & { lines?: number }) {
  return (
    <DelayedStatus {...rest} className={cn("goose-skeleton-document", rest.className)}>
      <Skeleton className="goose-skeleton-heading" />
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className="goose-skeleton-line" style={{ width: widthAt(LINE_WIDTHS, index) }} />
      ))}
    </DelayedStatus>
  );
}
