import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS, FONT, LAYOUT } from "../theme";
import { flyIn, progressAt } from "../motion";
import { BodyText, CARD_BORDER, Check, Chip, Window } from "../components/Kit";
import { Eyebrow, MonoLabel, StaggerText } from "../components/Text";

/** 块在编辑区内的固定槽位（body 坐标系），拖动时只换槽位。 */
const SLOT = {
  title: { x: 26, y: 8, w: 900, h: 58 },
  todos: { x: 26, y: 76, w: 900, h: 126 },
  table: { x: 26, y: 220, w: 900, h: 156 },
  formula: { x: 26, y: 388, w: 900, h: 58 },
  flow: { x: 26, y: 458, w: 900, h: 62 },
};

/** 换槽位：表格升到待办的槽位，待办落到表格原位（含 12px 间距）。 */
const TABLE_DY = SLOT.todos.y - SLOT.table.y;
const TODOS_DY = SLOT.table.h + 12;

function Grip() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 3px)", gap: 3, opacity: 0.28 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ width: 3, height: 3, borderRadius: 1.5, background: COLORS.ink }} />
      ))}
    </div>
  );
}

function Slot({
  frame,
  index,
  slot,
  dy = 0,
  lifted = false,
  children,
}: {
  frame: number;
  index: number;
  slot: { x: number; y: number; w: number; h: number };
  dy?: number;
  lifted?: boolean;
  children: React.ReactNode;
}) {
  const fly = flyIn(frame, 14 + index * 7, 240);
  return (
    <div
      style={{
        position: "absolute",
        left: slot.x,
        top: slot.y + dy,
        width: slot.w,
        height: slot.h,
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        padding: "8px 14px 8px 8px",
        boxSizing: "border-box",
        borderRadius: 12,
        background: lifted ? COLORS.white : "transparent",
        border: lifted ? `1.5px solid ${COLORS.accent}` : "1.5px solid transparent",
        boxShadow: lifted ? "0 8px 20px rgba(27,26,23,0.14)" : "none",
        zIndex: lifted ? 3 : 1,
        opacity: fly.opacity,
        transform: fly.transform,
      }}
    >
      <div style={{ paddingTop: 7, flex: "0 0 auto" }}>
        <Grip />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

export function S2Blocks() {
  const frame = useCurrentFrame();
  const up = progressAt(frame, 108, 18);
  const down = progressAt(frame, 126, 22);
  const hold = progressAt(frame, 96, 12);
  const menuIn = progressAt(frame, 62, 18);

  return (
    <AbsoluteFill>
      <Eyebrow index="02" label="块编辑" />

      <div style={{ position: "absolute", left: LAYOUT.text.left, top: 250, width: LAYOUT.text.width }}>
        <StaggerText
          parts={[{ text: "一个斜杠，\n" }, { text: "块就排好", serif: true }]}
          fontSize={92}
          lineHeight={1.18}
        />
        <div style={{ marginTop: 40, display: "flex", gap: 12 }}>
          {["/", "、", "biaoge"].map((k, i) => (
            <div key={k} style={{ opacity: progressAt(frame, 24 + i * 6, 16) }}>
              <Chip active={i === 0}>{k}</Chip>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 26, opacity: progressAt(frame, 44, 20) }}>
          <MonoLabel>表格 · 公式 · 流程图</MonoLabel>
        </div>
      </div>

      <Window title="季度复盘.md" style={{ position: "absolute", ...LAYOUT.mock }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Slot frame={frame} index={0} slot={SLOT.title}>
            <BodyText size={34} weight={700} color={COLORS.ink}>
              季度复盘
            </BodyText>
          </Slot>

          <Slot
            frame={frame}
            index={1}
            slot={SLOT.todos}
            dy={down * TODOS_DY}
            lifted={hold > 0 && down < 1}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {["上线新版官网", "完成 30 位用户访谈", "整理访谈结论"].map((label, i) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      border: `1.6px solid ${i < 2 ? COLORS.accent : "rgba(27,26,23,0.28)"}`,
                      background: i < 2 ? COLORS.accent : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {i < 2 ? <Check size={16} color={COLORS.white} /> : null}
                  </div>
                  <BodyText size={24} color={i < 2 ? COLORS.muted : COLORS.inkSoft}>
                    {label}
                  </BodyText>
                </div>
              ))}
            </div>
          </Slot>

          <Slot frame={frame} index={2} slot={SLOT.table} dy={up * TABLE_DY}>
            <div style={{ border: CARD_BORDER, borderRadius: 10, overflow: "hidden", fontFamily: FONT.sans }}>
              {[
                ["渠道", "7 月", "8 月"],
                ["官网", "120", "180"],
                ["社群", "80", "150"],
                ["线下", "60", "70"],
              ].map((row, r) => (
                <div
                  key={r}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.2fr 1fr 1fr",
                    padding: "7px 14px",
                    background: r === 0 ? "rgba(27,26,23,0.04)" : "transparent",
                    borderTop: r === 0 ? "none" : CARD_BORDER,
                    fontSize: 19,
                    color: r === 0 ? COLORS.muted : COLORS.inkSoft,
                  }}
                >
                  {row.map((cell) => (
                    <div key={cell}>{cell}</div>
                  ))}
                </div>
              ))}
            </div>
          </Slot>

          <Slot frame={frame} index={3} slot={SLOT.formula}>
            <div
              style={{
                background: "rgba(27,26,23,0.04)",
                borderRadius: 10,
                padding: "9px 16px",
                fontFamily: FONT.mono,
                fontSize: 20,
                color: COLORS.inkSoft,
                letterSpacing: "0.01em",
              }}
            >
              增长率 = (本月 − 上月) / 上月 × 100%
            </div>
          </Slot>

          <Slot frame={frame} index={4} slot={SLOT.flow}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {["选题", "写作", "排版"].map((node, i) => (
                <div key={node} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      padding: "5px 14px",
                      borderRadius: 8,
                      border: CARD_BORDER,
                      fontFamily: FONT.sans,
                      fontSize: 19,
                      color: COLORS.inkSoft,
                    }}
                  >
                    {node}
                  </div>
                  {i < 2 ? <div style={{ width: 22, height: 1.5, background: "rgba(27,26,23,0.28)" }} /> : null}
                </div>
              ))}
            </div>
          </Slot>

          <div
            style={{
              position: "absolute",
              left: 26,
              top: 528,
              width: 440,
              padding: 12,
              borderRadius: 14,
              background: COLORS.white,
              border: CARD_BORDER,
              boxShadow: "0 8px 20px rgba(27,26,23,0.12)",
              opacity: menuIn,
              transform: `translateY(${(1 - menuIn) * 18}px) scale(${0.94 + menuIn * 0.06})`,
              transformOrigin: "0% 0%",
            }}
          >
            {[
              { key: "biaoge", label: "表格", active: true },
              { key: "gongshi", label: "公式", active: false },
              { key: "liuchengtu", label: "流程图", active: false },
            ].map((item) => (
              <div
                key={item.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 14px",
                  borderRadius: 9,
                  background: item.active ? COLORS.accent : "transparent",
                  color: item.active ? COLORS.white : COLORS.inkSoft,
                  fontFamily: FONT.sans,
                  fontSize: 21,
                }}
              >
                <span>{item.label}</span>
                <span style={{ fontFamily: FONT.mono, fontSize: 17, opacity: 0.72 }}>/{item.key}</span>
              </div>
            ))}
          </div>
        </div>
      </Window>
    </AbsoluteFill>
  );
}
