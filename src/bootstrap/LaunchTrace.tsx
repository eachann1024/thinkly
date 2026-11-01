import type { CSSProperties } from "react";
import { WORKSPACE_SIDEBAR_DEFAULT_WIDTH } from "@/lib/sidebarLayout";
import "./launch-trace.css";

const sidebarBars = [132, 168, 120, 150, 104];
const bodyBars = ["100%", "93.333%", "97.333%", "63.333%"];
const stagger = (index: number): CSSProperties => ({
  "--goose-launch-index": index,
}) as CSSProperties;

export function LaunchTrace() {
  return (
    <div
      className="goose-launch-root"
      style={{ "--goose-launch-sidebar-width": `${WORKSPACE_SIDEBAR_DEFAULT_WIDTH}px` } as CSSProperties}
    >
      <div className="goose-launch-sidebar">
        <div className="goose-launch-sidebar-surface" />
        <svg width="100%" height="100%" aria-hidden="true">
          {sidebarBars.map((width, index) => (
            <rect
              key={index}
              className="goose-launch-side-bar"
              style={stagger(index)}
              x="20" y={index === 0 ? 56 : 60 + index * 28}
              width={Math.min(width, WORKSPACE_SIDEBAR_DEFAULT_WIDTH - 40)}
              height="8" rx="4" fillOpacity={index === 0 ? 0.1 : 0.08}
            />
          ))}
          <line
            className="goose-launch-divider"
            x1={WORKSPACE_SIDEBAR_DEFAULT_WIDTH - 0.5} y1="0"
            x2={WORKSPACE_SIDEBAR_DEFAULT_WIDTH - 0.5} y2="100%"
            strokeWidth="1"
          />
        </svg>
      </div>
      <div className="goose-launch-content">
        <svg className="goose-launch-column" width="100%" height="320" aria-hidden="true">
          <rect
            className="goose-launch-line" style={stagger(0)}
            y="120" width="53.333%" height="14" rx="7" fillOpacity="0.14"
          />
          {bodyBars.map((width, index) => (
            <rect
              key={index}
              className="goose-launch-line" style={stagger(index + 1)}
              y={168 + index * 24} width={width} height="8" rx="4" fillOpacity="0.08"
            />
          ))}
          <rect
            className="goose-launch-line goose-launch-cursor" style={stagger(5)}
            y="276" width="2" height="18" rx="1"
          />
        </svg>
      </div>
      <svg className="goose-launch-frame" width="100%" height="100%" aria-hidden="true">
        <rect className="goose-launch-trace" x="0.5" y="0.5" rx="10" pathLength="1" />
      </svg>
    </div>
  );
}
