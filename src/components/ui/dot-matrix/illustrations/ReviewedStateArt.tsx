import { memo, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { DotMatrixMotion } from "../DotMatrixMotion";
import { DotGroup } from "../Dots";
import { REVIEWED_STATE_ART, type ReviewedArtGroup } from "./reviewedStateArtData";

export type ReviewedStateArtKind = keyof typeof REVIEWED_STATE_ART;

function ArtGroup({ group, index }: { group: ReviewedArtGroup; index: number }) {
  return (
    <DotGroup dots={group.dots} enter={index} loop={group.loop} delay={group.delay} period={group.period} />
  );
}

export const ReviewedStateArt = memo(function ReviewedStateArt({
  kind,
  className,
}: {
  kind: ReviewedStateArtKind;
  className?: string;
}) {
  const art = REVIEWED_STATE_ART[kind];
  return (
    <DotMatrixMotion width={art.width} height={art.height} viewBox={art.viewBox}
      className={cn("shrink-0 text-foreground", className)}
      style={{ "--dm-progress-low": 0.55 } as CSSProperties}>
      {art.groups.filter(group => group.tone !== "danger").map((group, index) => (
        <ArtGroup key={index} group={group} index={index} />
      ))}
      {art.groups.some(group => group.tone === "danger") && (
        <g style={{ color: "var(--goose-color-danger)" }}>
          <DotGroup enter={3} loop="alert" period={12}>
            {art.groups.filter(group => group.tone === "danger").map((group, index) => (
              <DotGroup key={index} dots={group.dots} enter={false} />
            ))}
          </DotGroup>
        </g>
      )}
    </DotMatrixMotion>
  );
});
