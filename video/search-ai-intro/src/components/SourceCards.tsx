import { useCurrentFrame } from "remotion";
import { COLORS, FONT } from "../theme";
import { FileIcon } from "./Icons";

const SOURCES = [
  {
    title: "10 月 12 日 · 周会记录",
    meta: "产品知识库 · 会议",
    excerpt: "确认 V3 版本在 11 月 6 日进入灰度；全局搜索与 AI 问答合并为同一个入口，来源必须可回溯。",
  },
  {
    title: "产品路线图 V3",
    meta: "产品知识库 · 规划",
    excerpt: "11 月：搜索支持拼音与正文命中；问答沿用只读代理，只引用、不改写任何笔记。",
  },
  {
    title: "客户访谈摘要",
    meta: "研究 · 访谈",
    excerpt: "用户最常问的是：上周的结论落在哪篇笔记里？希望能直接看到出处，而不是重新翻一遍。",
  },
  {
    title: "项目复盘 · Q3",
    meta: "复盘 · 总结",
    excerpt: "搜索入口从命令面板升级为常驻底部面板；下一步补齐回答里的来源展示与继续对话。",
  },
  {
    title: "搜索入口设计稿",
    meta: "设计 · 交互",
    excerpt: "底部拉起的面板同时容纳检索、筛选与 AI 回答，回答与来源在同一视图中完成。",
  },
];

const CARD_HEIGHT = 260;
const GAP = 24;

export function SourceCards() {
  const frame = useCurrentFrame();
  const distance = SOURCES.length * (CARD_HEIGHT + GAP) - GAP - 1170;
  const offset = -Math.min(distance, (frame / 240) * distance);

  return (
    <div
      style={{
        position: "absolute",
        left: 96,
        top: 650,
        width: 888,
        height: 1170,
        overflow: "hidden",
        borderRadius: 24,
        border: `1px solid ${COLORS.border}`,
        background: COLORS.surface,
        boxShadow: "0 8px 24px rgba(27,26,23,0.07)",
      }}
    >
      <div style={{ transform: `translateY(${offset}px)`, padding: 28 }}>
        {SOURCES.map((source, index) => (
          <div
            key={source.title}
            style={{
              position: "relative",
              height: CARD_HEIGHT,
              marginBottom: GAP,
              padding: "26px 28px 24px 92px",
              borderRadius: 18,
              border: `1px solid ${COLORS.border}`,
              background: COLORS.surface,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 24,
                top: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 44,
                borderRadius: 22,
                background: COLORS.accentSoft,
                color: COLORS.accentDeep,
                fontFamily: FONT.mono,
                fontSize: 24,
              }}
            >
              {index + 1}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <FileIcon size={26} />
              <span
                style={{
                  fontFamily: FONT.sans,
                  fontSize: 34,
                  fontWeight: 500,
                  color: COLORS.ink,
                  letterSpacing: "-0.01em",
                }}
              >
                {source.title}
              </span>
            </div>
            <div style={{ marginTop: 6, fontFamily: FONT.sans, fontSize: 22, color: COLORS.muted }}>
              {source.meta}
            </div>
            <div
              style={{
                marginTop: 14,
                fontFamily: FONT.sans,
                fontSize: 26,
                lineHeight: 1.5,
                color: COLORS.inkSoft,
              }}
            >
              {source.excerpt}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
