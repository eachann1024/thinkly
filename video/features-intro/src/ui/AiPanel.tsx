import type { ReactNode } from "react";
import { C } from "../theme";
import { Caret } from "./Doc";
import { Icon } from "./Icons";

export const AI_W = 338;

export function Mention({ name }: { name: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 22,
        padding: "0 7px",
        borderRadius: 6,
        fontSize: 13,
        color: C.accent,
        background: C.selected,
        marginRight: 6,
        verticalAlign: "middle",
      }}
    >
      @{name}
    </span>
  );
}

export function AiHeader({ title }: { title: string }) {
  return (
    <div style={{ height: 60, padding: "0 16px", display: "flex", alignItems: "center", gap: 14 }}>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 560, whiteSpace: "nowrap", overflow: "hidden" }}>{title}</span>
      <Icon name="plus" size={16} color={C.text3} />
      <Icon name="more" size={16} color={C.text3} stroke={2.2} />
      <Icon name="x" size={16} color={C.text3} />
    </div>
  );
}

export function Composer({
  children,
  placeholder = "向 AI 提问，/ 调用指令或 Skill，@ 引用笔记",
  caret = false,
  ready = false,
  press = false,
}: {
  children?: ReactNode;
  placeholder?: string;
  caret?: boolean;
  ready?: boolean;
  press?: boolean;
}) {
  return (
    <div style={{ position: "absolute", left: 16, right: 16, bottom: 16 }}>
      <div
        style={{
          padding: 12,
          borderRadius: 14,
          background: C.paper,
          boxShadow: "0 0 0 1px rgba(31,30,29,0.09), 0 2px 8px rgba(31,30,29,0.05)",
        }}
      >
        <div style={{ minHeight: 44, fontSize: 14, lineHeight: "22px", color: C.text }}>
          {children ? (
            <>
              {children}
              {caret ? <Caret height={16} /> : null}
            </>
          ) : (
            <span style={{ color: C.text3 }}>{placeholder}</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, height: 28 }}>
          <Icon name="plus" size={16} color={C.text2} />
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: C.text2 }}>deepseek-v4-flash</span>
          <Icon name="chevronDown" size={12} color={C.text3} />
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
              background: ready ? C.text : "#d6d5d1",
              transform: `scale(${press ? 0.9 : 1})`,
            }}
          >
            <Icon name="arrowUp" size={15} color="#fff" stroke={2.2} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function UserBubble({ children, appear }: { children: ReactNode; appear: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", opacity: appear, transform: `translateY(${(1 - appear) * 24}px)` }}>
      <div
        style={{
          maxWidth: 300,
          padding: "7px 12px",
          borderRadius: 12,
          fontSize: 14,
          lineHeight: "22px",
          background: C.paper,
          boxShadow: "inset 0 0 0 1px #f3f2f1, 0 1px 4px rgba(31,30,29,0.08)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
