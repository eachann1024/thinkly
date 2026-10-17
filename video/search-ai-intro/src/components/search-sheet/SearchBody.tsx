import { COLORS, FONT } from "../../theme";
import { cardIn } from "../../motion";
import { FileIcon, SparkleIcon } from "../Icons";
import { Highlight, Kbd } from "./SheetChrome";

const ROWS = [
  {
    title: "10 月 12 日 · 周会记录",
    meta: "产品知识库 · 10 月 12 日",
    snippet: "周会确认 V3 版本在 11 月 6 日进入灰度；全局搜索与 AI 问答合并为同一个入口，来源必须可回溯。",
    hits: 2,
  },
  {
    title: "产品路线图 V3",
    meta: "产品知识库 · 10 月 9 日",
    snippet: "上周会议后更新：11 月进入灰度，搜索支持拼音与正文命中；问答只引用、不改写笔记。",
    hits: 3,
  },
  {
    title: "客户访谈摘要",
    meta: "研究 · 10 月 8 日",
    snippet: "用户最常问的是：上周的结论落在哪篇笔记里？希望能直接看到出处，而不是重新翻一遍。",
    hits: 1,
  },
  {
    title: "项目复盘 · Q3",
    meta: "复盘 · 9 月 30 日",
    snippet: "周会复盘：搜索入口升级为常驻底部面板；下一步补齐回答里的来源展示与继续对话。",
    hits: 1,
  },
  {
    title: "搜索入口设计稿",
    meta: "设计 · 9 月 26 日",
    snippet: "上周走查：底部面板同时容纳检索、筛选与 AI 回答，回答和来源在同一视图里完成。",
    hits: 1,
  },
];

function AskAiRow({ frame, delay }: { frame: number; delay: number }) {
  const enter = cardIn(frame, delay, 18);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        margin: "16px 14px 6px",
        padding: "0 18px",
        height: 76,
        borderRadius: 10,
        background: COLORS.accentSoft,
        boxShadow: `inset 0 0 0 1px ${COLORS.accent}8f`,
        ...enter,
      }}
    >
      <SparkleIcon size={28} />
      <span
        style={{
          flex: 1,
          fontFamily: FONT.sans,
          fontSize: 27,
          color: COLORS.ink,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}
      >
        用 AI 回答，引用命中的笔记
      </span>
      <Kbd>↵</Kbd>
    </div>
  );
}

function ResultRow({
  index,
  title,
  meta,
  snippet,
  hits,
  frame,
}: {
  index: number;
  title: string;
  meta: string;
  snippet: string;
  hits: number;
  frame: number;
}) {
  const delay = index < 3 ? -30 : 4 + (index - 3) * 6;
  const enter = cardIn(frame, delay, 18);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "34px minmax(0, 1fr)",
        columnGap: 16,
        margin: "0 14px",
        padding: "16px 18px",
        borderRadius: 10,
        ...enter,
      }}
    >
      <div style={{ paddingTop: 2 }}>
        <FileIcon size={28} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: FONT.sans,
              fontSize: 30,
              fontWeight: 500,
              color: COLORS.ink,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            <Highlight text={title} />
          </div>
          <span
            style={{
              flex: "none",
              fontFamily: FONT.mono,
              fontSize: 20,
              letterSpacing: "0.02em",
              color: COLORS.muted,
            }}
          >
            命中 {hits} 处
          </span>
        </div>
        <div style={{ marginTop: 4, fontFamily: FONT.sans, fontSize: 22, color: COLORS.muted }}>
          {meta}
        </div>
        <div
          style={{
            marginTop: 6,
            fontFamily: FONT.sans,
            fontSize: 25,
            lineHeight: 1.45,
            color: COLORS.muted,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          <Highlight text={snippet} />
        </div>
      </div>
    </div>
  );
}

export function SearchBody({ frame, resultCount }: { frame: number; resultCount: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <AskAiRow frame={frame} delay={-30} />
      {resultCount > 0 ? (
        <>
          <div
            style={{
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 32px",
              fontFamily: FONT.sans,
              fontSize: 23,
              color: COLORS.muted,
            }}
          >
            <span>相关笔记</span>
            <span>来自 4 个笔记本</span>
          </div>
          {ROWS.slice(0, resultCount).map((row, index) => (
            <ResultRow key={row.title} index={index} frame={frame} {...row} />
          ))}
        </>
      ) : null}
    </div>
  );
}
