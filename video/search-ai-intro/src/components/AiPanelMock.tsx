import { COLORS, FONT } from "../theme";
import { CheckIcon, FileIcon, SendIcon, SparkleIcon } from "./Icons";

const TODOS = ["11 月 6 日灰度 V3", "补齐搜索来源展示", "合并搜索与 AI 入口的埋点", "跟进客户导出问题"];

export function AiPanelMock() {
  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        top: 600,
        width: 920,
        height: 1220,
        display: "flex",
        flexDirection: "column",
        borderRadius: 24,
        border: `1px solid ${COLORS.border}`,
        background: COLORS.surface,
        boxShadow: "0 8px 24px rgba(27,26,23,0.08)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          height: 84,
          padding: "0 30px",
          borderBottom: `1px solid ${COLORS.borderSoft}`,
        }}
      >
        <span style={{ width: 10, height: 10, borderRadius: 5, background: COLORS.accent }} />
        <span style={{ fontFamily: FONT.sans, fontSize: 28, fontWeight: 600, color: COLORS.ink }}>
          项目知识库
        </span>
        <span style={{ flex: 1 }} />
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            height: 44,
            padding: "0 16px",
            borderRadius: 8,
            border: `1px solid ${COLORS.border}`,
            fontFamily: FONT.mono,
            fontSize: 20,
            color: COLORS.muted,
          }}
        >
          DeepSeek V3.2
        </span>
      </div>

      <div style={{ flex: 1, padding: "30px 30px 0", display: "flex", flexDirection: "column", gap: 26 }}>
        <div style={{ alignSelf: "flex-end", maxWidth: 620 }}>
          <div
            style={{
              padding: "20px 24px",
              borderRadius: "18px 18px 4px 18px",
              background: COLORS.accentSoft,
              boxShadow: `inset 0 0 0 1px ${COLORS.accent}40`,
              fontFamily: FONT.sans,
              fontSize: 27,
              lineHeight: 1.5,
              color: COLORS.ink,
            }}
          >
            把这次会议整理成待办，写进《周会记录》。
          </div>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          <div style={{ paddingTop: 2 }}>
            <SparkleIcon size={28} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT.sans, fontSize: 27, color: COLORS.ink, lineHeight: 1.5 }}>
              已从 3 篇笔记整理出 4 条待办：
            </div>
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              {TODOS.map((todo) => (
                <div key={todo} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      border: `1.5px solid ${COLORS.inkSoft}`,
                      flex: "none",
                    }}
                  />
                  <span style={{ fontFamily: FONT.sans, fontSize: 26, color: COLORS.ink }}>{todo}</span>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 26,
                padding: "20px 22px",
                borderRadius: 14,
                border: `1px solid ${COLORS.accent}70`,
                background: COLORS.accentSoft,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <FileIcon size={24} color={COLORS.accentDeep} />
                <span style={{ fontFamily: FONT.sans, fontSize: 25, fontWeight: 500, color: COLORS.ink }}>
                  将写入《周会记录》
                </span>
                <span style={{ flex: 1 }} />
                <span style={{ fontFamily: FONT.mono, fontSize: 19, color: COLORS.accentDeep }}>
                  4 处修改
                </span>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    height: 46,
                    padding: "0 18px",
                    borderRadius: 8,
                    border: `1px solid ${COLORS.border}`,
                    fontFamily: FONT.sans,
                    fontSize: 22,
                    color: COLORS.ink,
                  }}
                >
                  查看差异
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    height: 46,
                    padding: "0 18px",
                    borderRadius: 8,
                    background: COLORS.accent,
                    fontFamily: FONT.sans,
                    fontSize: 22,
                    fontWeight: 500,
                    color: COLORS.white,
                  }}
                >
                  <CheckIcon size={20} color={COLORS.white} />
                  应用
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "18px 24px 24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            height: 76,
            padding: "0 12px 0 24px",
            borderRadius: 16,
            border: `1px solid ${COLORS.border}`,
            background: COLORS.surface,
          }}
        >
          <span style={{ flex: 1, fontFamily: FONT.sans, fontSize: 25, color: COLORS.muted }}>
            继续追问，或 @ 引用笔记…
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 52,
              height: 52,
              borderRadius: 12,
              background: COLORS.accent,
            }}
          >
            <SendIcon size={24} />
          </span>
        </div>
      </div>
    </div>
  );
}
