import { FONT_MONO, pop, ramp } from "../theme";

/** 演示用按键提示：落在窗口下方中央，弹入后淡出。 */
export function Keys({ keys, f, at, hold = 50, y = 560 }: { keys: string[]; f: number; at: number; hold?: number; y?: number }) {
  if (f < at || f > at + hold + 14) return null;
  const a = pop(f, at, 14);
  const out = ramp(f, at + hold, at + hold + 12);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: y,
        display: "flex",
        justifyContent: "center",
        zIndex: 90,
        opacity: Math.min(1, a) * (1 - out),
        transform: `translateY(${(1 - a) * 10}px)`,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: 6,
          borderRadius: 12,
          background: "rgba(31,30,29,0.86)",
          boxShadow: "0 8px 24px rgba(31,30,29,0.2)",
        }}
      >
        {keys.map((key) => (
          <div
            key={key}
            style={{
              minWidth: 34,
              height: 34,
              padding: "0 10px",
              borderRadius: 7,
              display: "grid",
              placeItems: "center",
              fontFamily: FONT_MONO,
              fontSize: 17,
              color: "#f0efec",
              background: "rgba(255,255,255,0.1)",
              boxShadow: "inset 0 -1px 0 rgba(255,255,255,0.08)",
            }}
          >
            {key}
          </div>
        ))}
      </div>
    </div>
  );
}
