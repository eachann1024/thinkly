import { createContext, useContext } from "react";
import type { useHistoryRestoreActions } from "./logic/useHistoryRestoreActions";

type HistoryViewLogic = ReturnType<typeof useHistoryRestoreActions> & {
  isEmpty: boolean;
};

export const HistoryViewContext = createContext<HistoryViewLogic | null>(null);

export function useHistoryViewLogic() {
  const history = useContext(HistoryViewContext);
  if (!history) {
    throw new Error("历史视图必须在 HistoryViewProvider 内使用");
  }
  return history;
}
