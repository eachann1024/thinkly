import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DOT_MOTION_INITIAL, useDotMotion } from "./useDotMotion";
import "./dot-matrix.css";

export function DotMatrixMotion({
  width,
  height,
  viewBox,
  origin,
  motion = "auto",
  className,
  style,
  children,
}: {
  width: number;
  height: number;
  viewBox?: string;
  origin?: [number, number];
  motion?: "auto" | "corner";
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const ref = useDotMotion<SVGSVGElement>();
  const originVars = origin
    ? ({
        "--dm-ox": `${origin[0]}%`,
        "--dm-oy": `${origin[1]}%`,
      } as CSSProperties)
    : undefined;
  const motionClass =
    motion === "corner"
      ? "goose-dm-corner"
      : Math.max(width, height) <= 96
        ? "goose-dm-small"
        : "goose-dm-main";
  return (
    <svg
      ref={ref}
      {...DOT_MOTION_INITIAL}
      className={cn("goose-dm", motionClass, className)}
      style={originVars || style ? { ...originVars, ...style } : undefined}
      width={width}
      height={height}
      viewBox={viewBox ?? `0 0 ${width} ${height}`}
      aria-hidden
      focusable="false"
    >
      {children}
    </svg>
  );
}
