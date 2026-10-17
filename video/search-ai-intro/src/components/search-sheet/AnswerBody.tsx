import type { ReactNode } from "react";
import { COLORS, FONT } from "../../theme";
import { cardIn } from "../../motion";
import { ArrowLeftIcon, FileIcon, MessageIcon, SparkleIcon } from "../Icons";
import { Kbd, QUERY } from "./SheetChrome";

function Cite({ children }: { children: ReactNode }) {
  return (
    <sup
      style={{
        fontFamily: FONT.mono,
        fontSize: 18,
        color: COLORS.accentDeep,
        marginLeft: 2,
        letterSpacing: 0,
      }}
    >
      {children}
    </sup>
  );
}

export function AnswerBody({ frame }: { frame: number }) {
  const enter = cardIn(frame, -8, 18);
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, ...enter }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "26px 40px 0" }}>
        <div style={{ paddingTop: 4 }}>
          <SparkleIcon size={28} />
        </div>
        <div style={{ fontFamily: FONT.sans, fontSize: 32, fontWeight: 500, color: COLORS.ink }}>
          {QUERY}
        </div>
      </div>
      <div
        style={{
          padding: "26px 40px 0 84px",
          fontFamily: FONT.sans,
          fontSize: 29,
          lineHeight: 1.72,
          color: COLORS.ink,
        }}
      >
        <div>上周会议确认了三件事：</div>
        <div style={{ marginTop: 12 }}>
          1. V3 于 11 月 6 日进入灰度
          <Cite>[1]</Cite>
        </div>
        <div>2. 全局搜索与 AI 问答合并为同一入口<Cite>[1][2]</Cite></div>
        <div>3. 客户提到的导出问题排在灰度之后<Cite>[2]</Cite></div>
        <div style={{ marginTop: 16, color: COLORS.inkSoft }}>
          记录里还留了一条待办：灰度前补齐搜索来源的展示。
        </div>
      </div>
      <div style={{ padding: "30px 40px 0 84px" }}>
        <div style={{ fontFamily: FONT.sans, fontSize: 23, color: COLORS.muted }}>来源</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 14 }}>
          {["10 月 12 日 · 周会记录", "产品路线图 V3"].map((title, index) => (
            <span
              key={title}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                height: 52,
                padding: "0 16px",
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                fontFamily: FONT.sans,
                fontSize: 24,
                color: COLORS.ink,
              }}
            >
              <span style={{ fontFamily: FONT.mono, fontSize: 20, color: COLORS.muted }}>
                {index + 1}
              </span>
              <FileIcon size={22} />
              {title}
            </span>
          ))}
        </div>
      </div>
      <div
        style={{
          marginTop: "auto",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "18px 32px 24px 40px",
          borderTop: `1px solid ${COLORS.borderSoft}`,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            height: 54,
            padding: "0 16px",
            fontFamily: FONT.sans,
            fontSize: 24,
            color: COLORS.ink,
          }}
        >
          <ArrowLeftIcon size={22} />
          返回结果
          <Kbd>Esc</Kbd>
        </span>
        <span
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            height: 54,
            padding: "0 18px",
            borderRadius: 8,
            background: COLORS.accentSoft,
            boxShadow: `inset 0 0 0 1px ${COLORS.accent}`,
            fontFamily: FONT.sans,
            fontSize: 24,
            fontWeight: 500,
            color: COLORS.ink,
          }}
        >
          <MessageIcon size={22} />
          在 AI 面板继续
          <Kbd>⌘↵</Kbd>
        </span>
      </div>
    </div>
  );
}
