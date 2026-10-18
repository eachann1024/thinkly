import { C, MENU_SHADOW, pop, ramp } from "../theme";
import { Icon } from "./Icons";

/** 全局通知：窗口右上角滑入，停留后淡出。 */
export function Toast({ text, f, at, hold = 70 }: { text: string; f: number; at: number; hold?: number }) {
  if (f < at || f > at + hold + 16) return null;
  const a = pop(f, at, 16);
  const out = ramp(f, at + hold, at + hold + 14);
  return (
    <div
      style={{
        position: "absolute",
        right: 16,
        top: 56,
        height: 40,
        padding: "0 14px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        borderRadius: 8,
        fontSize: 13,
        color: C.text,
        background: C.menu,
        boxShadow: MENU_SHADOW,
        zIndex: 95,
        opacity: Math.min(1, a) * (1 - out),
        transform: `translateX(${(1 - a) * 24}px)`,
      }}
    >
      <Icon name="check" size={15} color="#3f9142" stroke={2.2} />
      {text}
    </div>
  );
}
