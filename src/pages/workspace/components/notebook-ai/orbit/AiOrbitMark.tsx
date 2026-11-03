import { memo, useMemo, useRef } from "react";
import { IDLE_ORBIT_FIELD, RUN_ORBIT_MARK, type OrbitDot, type OrbitField } from "./orbitGeometry";
import { useOrbitPause } from "./useOrbitPause";
import "./ai-orbit.css";

function Dot({ dot }: { dot: OrbitDot }) {
  return (
    <span
      className="ai-orbit-dot"
      style={{ left: dot.x, top: dot.y, width: dot.size, height: dot.size, opacity: dot.opacity }}
    />
  );
}

function OrbitFieldView({ field }: { field: OrbitField }) {
  return (
    <>
      {field.rings.map((ring) => (
        <div
          key={ring.delay}
          className="ai-orbit-ring"
          style={{ animationDelay: `${ring.delay}s`, maskImage: ring.mask, WebkitMaskImage: ring.mask }}
        />
      ))}
      <div className="ai-orbit-anchor">
        {field.orbits.map((orbit) => (
          <div
            key={orbit.duration}
            className="ai-orbit-path"
            style={{ ["--ai-orbit-dur" as string]: `${orbit.duration}s` }}
          >
            {orbit.dots.map((dot, index) => (
              <span
                key={index}
                className="ai-orbit-comet-wrap"
                style={{ left: dot.x, top: dot.y, width: orbit.size, height: orbit.size, opacity: dot.opacity }}
              >
                <span className="ai-orbit-comet" style={{ animationDelay: `${dot.delay}s` }} />
              </span>
            ))}
          </div>
        ))}
        <div className="ai-orbit-star">
          {field.star.map((dot) => (
            <Dot key={`${dot.x}:${dot.y}`} dot={dot} />
          ))}
          <div className="ai-orbit-core">
            {field.core.map((dot) => (
              <Dot key={`${dot.x}:${dot.y}`} dot={dot} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export const AiOrbitMark = memo(function AiOrbitMark({ variant }: { variant: "idle" | "run" }) {
  const ref = useRef<HTMLDivElement>(null);
  useOrbitPause(ref);
  const field = useMemo(() => (variant === "run" ? RUN_ORBIT_MARK : IDLE_ORBIT_FIELD), [variant]);
  return (
    <div ref={ref} className={variant === "run" ? "ai-orbit ai-orbit--run" : "ai-orbit ai-orbit--idle"} aria-hidden="true">
      <OrbitFieldView field={field} />
    </div>
  );
});
