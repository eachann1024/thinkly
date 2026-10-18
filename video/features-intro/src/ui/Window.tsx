import type { ReactNode } from "react";
import { Img, staticFile } from "remotion";
import { C, FONT_UI } from "../theme";
import { Icon } from "./Icons";
import { SidebarRailIcon, type SidebarRailIconName } from "./RailIcon";

export const WIN = { w: 1180, h: 660, title: 44, rail: 64, sidebar: 240, scale: 1.36 };

export type Tab = { name: string; active?: boolean };

function TrafficLights() {
  return (
    <div style={{ position: "absolute", left: 16, top: 16, display: "flex", gap: 8 }}>
      {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
        <div
          key={c}
          style={{ width: 12, height: 12, borderRadius: 6, background: c, boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.12)" }}
        />
      ))}
    </div>
  );
}

function Tabs({ tabs }: { tabs: Tab[] }) {
  const multi = tabs.length > 1;
  return (
    <div
      style={{
        position: "absolute",
        left: WIN.rail + WIN.sidebar,
        right: 4,
        top: 4,
        height: 36,
        display: "flex",
        gap: 8,
        alignItems: "center",
      }}
    >
      {tabs.map((tab) => {
        const on = multi && tab.active;
        return (
          <div
            key={tab.name}
            style={{
              flex: multi ? "0 1 220px" : "0 1 auto",
              height: 36,
              padding: "0 12px",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              fontWeight: 460,
              color: on || !multi ? C.text : C.text2,
              background: on ? C.selected : "transparent",
              boxShadow: on ? `inset 0 0 0 1px ${C.accent}` : "none",
            }}
          >
            <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden" }}>{tab.name}</span>
            {multi ? <Icon name="x" size={13} color={C.text3} /> : null}
          </div>
        );
      })}
      <div style={{ flex: 1 }} />
      <Icon name="plus" size={16} color={C.text3} />
      <div style={{ width: 10 }} />
      <Icon name="more" size={16} color={C.text3} stroke={2.2} />
      <div style={{ width: 8 }} />
    </div>
  );
}

function Rail({ active }: { active: SidebarRailIconName }) {
  const btn = (name: SidebarRailIconName) => {
    const on = name === active;
    return (
      <div
        key={name}
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          display: "grid",
          placeItems: "center",
          color: on ? C.text : C.text2,
          background: on ? C.selected : "transparent",
          boxShadow: on ? `inset 0 0 0 1px ${C.accent}` : "none",
        }}
      >
        <SidebarRailIcon name={name} selected={on} size={22} />
      </div>
    );
  };
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: WIN.title,
        bottom: 4,
        width: WIN.rail,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
      }}
    >
      {(["folder", "outline", "search"] as const).map(btn)}
      <div style={{ flex: 1 }} />
      {btn("calendar")}
      <Img
        src={staticFile("img/a-main-light.png")}
        style={{ width: 28, height: 28, borderRadius: 14, margin: "6px 0 10px", boxShadow: `0 0 0 1px ${C.border}` }}
      />
    </div>
  );
}

export function Window({
  tabs,
  rail = "folder",
  sidebar,
  main,
  right,
  rightWidth = 0,
  overlay,
}: {
  tabs: Tab[];
  rail?: SidebarRailIconName;
  sidebar: ReactNode;
  main: ReactNode;
  right?: ReactNode;
  rightWidth?: number;
  overlay?: ReactNode;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: WIN.w,
        height: WIN.h,
        borderRadius: 12,
        overflow: "hidden",
        background: C.shell,
        fontFamily: FONT_UI,
        color: C.text,
        boxShadow: "0 0 0 1px rgba(0,0,0,0.08), 0 24px 60px rgba(31,30,29,0.14), 0 4px 14px rgba(31,30,29,0.06)",
      }}
    >
      <TrafficLights />
      <Tabs tabs={tabs} />
      <Rail active={rail} />
      <div
        style={{
          position: "absolute",
          left: WIN.rail,
          right: 4,
          top: WIN.title,
          bottom: 4,
          borderRadius: 10,
          overflow: "hidden",
          display: "flex",
          background: C.paper,
        }}
      >
        <div style={{ width: WIN.sidebar, flex: "none", background: C.sidebar, position: "relative" }}>{sidebar}</div>
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>{main}</div>
        {rightWidth > 0 ? (
          <div
            style={{
              width: rightWidth,
              flex: "none",
              background: C.sidebar,
              boxShadow: `inset 1px 0 0 ${C.line}`,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {right}
          </div>
        ) : null}
      </div>
      {overlay}
    </div>
  );
}
