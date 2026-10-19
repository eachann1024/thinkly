import { memo } from "react";
import { cn } from "@/lib/utils";
import { DotMatrixMotion } from "../DotMatrixMotion";
import { DotGroup } from "../Dots";
import { EMPTY_ART, type EmptyArtGroup } from "./emptyStateArtData";
import "./empty-state-art.css";

export type EmptyStateArtKind = keyof typeof EMPTY_ART;

/** Keep the approved nested groups: their opacity also applies to child dots. */
function ArtGroup({ group }: { group: EmptyArtGroup }) {
  const body = (
    <g className={group.tone.split(" ").filter(Boolean).map(tone => `goose-empty-art-${tone}`).join(" ")}>
      {group.dots.map(([x, y, radius], index) => (
        <circle key={index} cx={x} cy={y} r={radius} />
      ))}
      {group.groups.map((child, index) => <ArtGroup key={index} group={child} />)}
    </g>
  );
  return group.tone.includes("signal")
    ? <DotGroup enter={false} loop="breathe" period={7}>{body}</DotGroup>
    : group.tone.includes("motion")
      ? <DotGroup enter={false} loop="wave" period={8}>{body}</DotGroup>
      : body;
}

/** Round-dot paths sampled offline; no DOM measurement or per-frame JavaScript. */
export const EmptyStateArt = memo(function EmptyStateArt({
  kind,
  width = 136,
  className,
}: {
  kind: EmptyStateArtKind;
  width?: number;
  className?: string;
}) {
  const isError = kind === "noteError" || kind === "searchError";
  return (
    <DotMatrixMotion width={width} height={width * 136 / 220} viewBox="0 0 220 136"
      className={cn("goose-empty-art", className)}>
      <DotGroup loop={isError ? "alert" : undefined}>
        <ArtGroup group={EMPTY_ART[kind]} />
      </DotGroup>
    </DotMatrixMotion>
  );
});
