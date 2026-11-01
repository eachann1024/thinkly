import type { CSSProperties } from "react";
import { isElectronRuntime } from "@/lib/electron/runtime";
import { WORKSPACE_SIDEBAR_DEFAULT_WIDTH } from "@/lib/sidebarLayout";
import "./launch-trace.css";

const sidebarBars = [96, 84, 64, 112];
const bodyBars = [
  { width: "34%", delay: 820, kind: "title" },
  { width: "10%", delay: 880, kind: "heading" },
  { width: "96%", delay: 920 },
  { width: "88%", delay: 960 },
  { width: "92%", delay: 1000 },
  { width: "58%", delay: 1040 },
  { width: "10%", delay: 1080, kind: "heading" },
  { width: "84%", delay: 1120 },
  { width: "70%", delay: 1160 },
];
const delayed = (delay: number, width?: string): CSSProperties => ({
  "--goose-launch-delay": `${delay}ms`,
  ...(width ? { width } : {}),
}) as CSSProperties;

export function LaunchTrace() {
  // 工作区的平台 class 在挂载后才设置，启动骨架沿用相同的平台判断。
  const platform = isElectronRuntime() && /Win/i.test(navigator.platform)
    ? "windows"
    : isElectronRuntime() && /Linux/i.test(navigator.platform) ? "linux" : "mac";

  return (
    <div
      className="goose-launch-root"
      data-platform={platform}
      aria-hidden="true"
      style={{ "--goose-launch-sidebar-width": `${WORKSPACE_SIDEBAR_DEFAULT_WIDTH}px` } as CSSProperties}
    >
      <div className="goose-launch-titlebar">
        <div className="goose-launch-navigation">
          {[700, 740, 780].map((delay) => (
            <span key={delay} className="goose-launch-bar goose-launch-in" style={delayed(delay)} />
          ))}
        </div>
        <span className="goose-launch-bar goose-launch-in goose-launch-tab" style={delayed(820)} />
      </div>
      <div className="goose-launch-rail">
        {[560, 610, 660, 710, 760, 810].map((delay, index) => (
          <span
            key={delay}
            className="goose-launch-icon goose-launch-pop"
            data-selected={index === 0 || undefined}
            style={delayed(delay)}
          />
        ))}
      </div>
      <div className="goose-launch-panel">
        <div className="goose-launch-fill">
          <div className="goose-launch-sidebar">
            {sidebarBars.map((width, index) => (
              <span
                key={width}
                className="goose-launch-bar goose-launch-in"
                style={delayed(760 + index * 40, `${width}px`)}
              />
            ))}
            <span className="goose-launch-selected goose-launch-in" style={delayed(940)}>
              <span className="goose-launch-bar" />
            </span>
          </div>
          <div className="goose-launch-content">
            <div className="goose-launch-document">
              <div className="goose-launch-column">
                {bodyBars.map(({ width, delay, kind }) => (
                  <span
                    key={delay}
                    className="goose-launch-bar goose-launch-line"
                    data-kind={kind}
                    style={delayed(delay, width)}
                  />
                ))}
                <span className="goose-launch-caret" />
              </div>
            </div>
          </div>
        </div>
        <span className="goose-launch-divider" />
        <svg className="goose-launch-frame" aria-hidden="true">
          <rect className="goose-launch-trace" x="0.5" y="0.5" pathLength="1" />
        </svg>
      </div>
    </div>
  );
}
