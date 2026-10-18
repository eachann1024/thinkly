import type { CSSProperties } from "react";
import { C, MENU_SHADOW } from "../theme";
import { Icon, type IconName } from "./Icons";

export type MenuItem = { icon: IconName; label: string; hint?: string };

export const MENU_ROW = 32;
export const MENU_GAP = 2;
export const MENU_INSET = 6;

export function Menu({
  items,
  active = -1,
  width = 280,
  appear = 1,
  style,
}: {
  items: MenuItem[];
  active?: number;
  width?: number;
  appear?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        position: "absolute",
        width,
        padding: MENU_INSET,
        borderRadius: 8,
        background: C.menu,
        boxShadow: MENU_SHADOW,
        display: "flex",
        flexDirection: "column",
        gap: MENU_GAP,
        opacity: Math.min(1, appear * 1.6),
        transform: `translateY(${(1 - appear) * -6}px) scale(${0.97 + appear * 0.03})`,
        transformOrigin: "top left",
        zIndex: 30,
        ...style,
      }}
    >
      {items.map((item, i) => {
        const on = i === active;
        return (
          <div
            key={item.label}
            style={{
              height: MENU_ROW,
              padding: "0 8px",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              color: C.text,
              background: on ? C.hover : "transparent",
            }}
          >
            <Icon name={item.icon} size={16} color={C.text2} />
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.hint ? <span style={{ fontSize: 12, color: C.text3 }}>{item.hint}</span> : null}
          </div>
        );
      })}
    </div>
  );
}
