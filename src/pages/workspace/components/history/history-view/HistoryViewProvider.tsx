import type { ReactNode } from "react";
import { useHistoryViewState } from "./logic/useHistoryViewState";
import { useHistoryRestoreActions } from "./logic/useHistoryRestoreActions";
import { HistoryViewContext } from "./useHistoryViewLogic";

/** 侧栏、顶栏和正文共用一次历史读取及操作状态。 */
export function HistoryViewProvider({ children }: { children: ReactNode }) {
  const history = useHistoryViewState();
  const actions = useHistoryRestoreActions(history);
  const value = { ...actions, isEmpty: history.groups.length === 0 };

  return (
    <HistoryViewContext.Provider value={value}>
      {children}
    </HistoryViewContext.Provider>
  );
}
