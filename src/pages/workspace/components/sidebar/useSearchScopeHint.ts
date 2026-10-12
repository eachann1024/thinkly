import { create } from "zustand";
import { useSearchSession } from "./useSearchSession";

const storageKey = "goose-note-search-scope-hint-seen";
let seen = false;
try { seen = window.localStorage.getItem(storageKey) === "true"; } catch { /* 本次运行仍只提示一次。 */ }

function claimFirstSearch() {
  if (seen) return false;
  seen = true;
  try { window.localStorage.setItem(storageKey, "true"); } catch { /* 不影响搜索操作。 */ }
  return true;
}

// 在会话打开时领取提示，避免组件重挂载或 StrictMode 重放吞掉首次提示。
export const useSearchScopeHint = create<{ visible: boolean }>(() => ({
  visible: useSearchSession.getState().open ? claimFirstSearch() : false,
}));

useSearchSession.subscribe((state, previous) => {
  if (state.open === previous.open) return;
  useSearchScopeHint.setState({ visible: state.open ? claimFirstSearch() : false });
});
