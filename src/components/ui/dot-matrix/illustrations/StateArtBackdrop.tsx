import { memo, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { DotMatrixMotion } from "../DotMatrixMotion";
import { DotGroup } from "../Dots";
import { STATE_BACKDROPS, type StateBackdropKind } from "./stateBackdropData";

export const StateArtBackdrop = memo(function StateArtBackdrop({
  kind,
  compact = false,
  className,
}: {
  kind: StateBackdropKind;
  compact?: boolean;
  className?: string;
}) {
  return (
    <span aria-hidden="true" data-state-backdrop={kind}
      className={cn("goose-dm-decor flex items-center text-foreground", compact ? "justify-end" : "justify-center", className)}>
      <DotMatrixMotion width={320} height={190} viewBox={compact ? "0 58 320 74" : "0 0 320 190"}
        className={compact ? "h-full w-auto max-w-[180px] shrink-0" : "h-auto w-full max-w-[360px] shrink-0"}
        style={{ "--dm-loop-low": 0.55, "--dm-progress-low": 0.55 } as CSSProperties}>
        {STATE_BACKDROPS[kind].map(({ dots, loop, delay, period }, index) => (
          <DotGroup key={index} dots={dots} enter={index} loop={loop} period={period} delay={delay} />
        ))}
      </DotMatrixMotion>
    </span>
  );
});
