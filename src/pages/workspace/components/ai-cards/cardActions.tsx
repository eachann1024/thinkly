import { createContext, useContext, type ReactNode } from "react";

/** 卡片能触发的宿主动作：AI 面板与搜索回答各自提供，缺省时卡片隐藏对应操作。 */
export type CardActions = {
  /** 作为用户的下一句话发出 */
  send?: (text: string) => void;
  /** 把 Markdown 插入当前笔记 */
  insert?: (markdown: string) => void;
  /** 宿主正在生成回复，发送类操作暂不可用 */
  busy?: boolean;
};

export const CardActionsContext = createContext<CardActions>({});

export function CardActionsProvider({ value, children }: { value: CardActions; children: ReactNode }) {
  return <CardActionsContext.Provider value={value}>{children}</CardActionsContext.Provider>;
}

export function useCardActions(): CardActions {
  return useContext(CardActionsContext);
}
