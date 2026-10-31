import { memo, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { DotMatrixMotion } from "../DotMatrixMotion";
import { DotGroup } from "../Dots";
import { loopVars } from "../motion";
import { SELECTED_STATE_ART, type SelectedStateArtKind } from "./selectedStateArtData";
import type { SelectedArtGroup, SelectedArtPart, SelectedArtTone } from "./selectedStateArtTypes";
import "./selected-state-art.css";

const color = (tone: SelectedArtTone) => tone === "accent"
  ? "var(--goose-accent-solid)"
  : tone === "danger" ? "var(--goose-color-danger)" : "currentColor";

function Part({ part, backdrop }: { part: SelectedArtPart; backdrop: boolean }) {
  if ("r" in part) return <circle cx={part.x} cy={part.y} r={part.r} fill={color(part.tone)} opacity={part.alpha} />;
  return <path d={part.d} fill="none" stroke={color(part.tone)} strokeOpacity={part.alpha}
    strokeWidth={part.width} strokeLinecap="round" strokeLinejoin="round"
    strokeDasharray={`.01 ${part.gap}`} vectorEffect={backdrop ? "non-scaling-stroke" : undefined} />;
}

function Groups({ groups, error = false, backdrop = false, scale = 1 }: {
  groups: SelectedArtGroup[];
  error?: boolean;
  backdrop?: boolean;
  scale?: number;
}) {
  return groups.map((group, index) => {
    const style = {
      ...loopVars({ delay: -group.phase, period: group.period }),
      "--dm-selected-low": group.low,
      "--dm-selected-shift": `${Math.min(group.amplitude, 1.5 / scale)}px`,
      "--dm-selected-origin": `${group.origin[0]}px ${group.origin[1]}px`,
    } as CSSProperties;
    return (
      <DotGroup key={index} enter={index}>
        <g data-selected-alert={error && group.parts.some(part => part.tone === "danger") || undefined}>
          <g data-selected-motion={group.motion ?? undefined} style={group.motion ? style : undefined}>
            {group.parts.map((part, i) => <Part key={i} part={part} backdrop={backdrop} />)}
          </g>
        </g>
      </DotGroup>
    );
  });
}

export const SelectedStateArt = memo(function SelectedStateArt({ kind, className, width, height }: {
  kind: SelectedStateArtKind;
  className?: string;
  width?: number;
  height?: number;
}) {
  const art = SELECTED_STATE_ART[kind];
  const w = width ?? art.width, h = height ?? art.height;
  const [pw, ph] = art.plane;
  const scale = Math.min(w / pw, h / ph);
  return (
    <DotMatrixMotion width={w} height={h}
      className={cn("goose-dm-selected shrink-0 text-foreground", className)}>
      <g transform={`translate(${(w - pw * scale) / 2} ${(h - ph * scale) / 2}) scale(${scale})`}>
        <Groups groups={art.foreground} error={kind === "noteError"} scale={scale} />
      </g>
    </DotMatrixMotion>
  );
});

export const SelectedStateBackdrop = memo(function SelectedStateBackdrop({ kind, compact = false, className }: {
  kind: SelectedStateArtKind;
  compact?: boolean;
  className?: string;
}) {
  const art = SELECTED_STATE_ART[kind];
  const [width, height] = art.backdropPlane;
  return (
    <span aria-hidden="true" data-selected-backdrop={kind}
      className={cn("goose-dm-decor goose-dm-selected-backdrop flex items-center justify-center text-foreground", className)}>
      <DotMatrixMotion width={width} height={height} preserveAspectRatio={compact ? "none" : undefined}
        className={cn("goose-dm-selected shrink-0", compact ? "h-full w-full" : "h-auto w-[320px] max-w-none")}>
        <Groups groups={art.background} backdrop />
      </DotMatrixMotion>
    </span>
  );
});
