import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { openPageBeside } from "@/lib/editor-split/openPageBeside";
import type { SearchWindowCommand } from "@/lib/electron/searchWindow";
import { isPlatformPrimaryModifierEvent } from "@/lib/shortcut-platform";
import type { SearchResultPage } from "../command/useCommandSearch";
import { useSearchSession } from "../sidebar/useSearchSession";
import { searchSplitPlacement } from "./searchSplitShortcut";

type SearchKeyContext = {
  answer: { status: string } | null;
  selectedId: string | undefined;
  results: SearchResultPage[];
  optionIds: string[];
  hasMore: boolean;
  aiRowId: string;
  composingRef: { current: boolean };
  suggestionsOpen: boolean;
  containsQueryTarget: (target: EventTarget | null) => boolean;
  containsSheetTarget: (target: EventTarget | null) => boolean;
  continueInPanel?: () => void;
  onCommand?: (command: SearchWindowCommand) => void;
  endSearch: () => void;
  resetAnswer: () => void;
  dismissSheet: () => void;
  loadMoreResults: () => void;
  setActiveId: (id: string) => void;
  confirmSelection: () => void;
  reveal: (id: string) => void;
};

export function handleSearchSheetKeyDownCapture(
  event: ReactKeyboardEvent<HTMLDivElement>,
  ctx: SearchKeyContext,
): void {
  const native = event.nativeEvent;
  if (native.isComposing || native.keyCode === 229) {
    if (event.key === "Enter" && !event.shiftKey) event.stopPropagation();
    return;
  }
  if (ctx.suggestionsOpen) return;
  if (event.key === "Enter" && isPlatformPrimaryModifierEvent(event) && !event.shiftKey && !event.altKey) {
    event.preventDefault();
    event.stopPropagation();
    if (ctx.continueInPanel && ctx.answer?.status !== "loading") ctx.continueInPanel();
    return;
  }
  const placement = searchSplitPlacement(event);
  if (!placement || ctx.answer || ctx.selectedId === ctx.aiRowId) return;
  const page = ctx.results.find((item) => item.id === ctx.selectedId);
  if (!page) return;
  event.preventDefault();
  event.stopPropagation();
  if (ctx.onCommand) {
    ctx.onCommand({
      type: "open-beside",
      pageId: page.id,
      placement,
      query: useSearchSession.getState().query,
      ...(page.localFilePath ? { localFilePath: page.localFilePath } : {}),
    });
    return;
  }
  if (openPageBeside(page.id, placement)) ctx.endSearch();
}

export function handleSearchSheetKeyDown(
  event: ReactKeyboardEvent<HTMLDivElement>,
  ctx: SearchKeyContext,
): void {
  if (!ctx.containsSheetTarget(event.target) || event.defaultPrevented) return;
  if (ctx.composingRef.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    if (ctx.answer) ctx.resetAnswer();
    else ctx.dismissSheet();
    return;
  }
  if (!ctx.containsQueryTarget(event.target)) return;
  if (ctx.suggestionsOpen && (event.key === "Tab" || event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "Enter")) return;
  if (event.key === "Tab" && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
    event.preventDefault();
    const latest = useSearchSession.getState();
    latest.setScope(latest.scope.kind === "all"
      ? { kind: "current", notebookId: latest.view.phase !== "closed" ? latest.view.context.startingNotebookId : null }
      : { kind: "all" });
    return;
  }
  if ((event.key === "ArrowDown" || event.key === "ArrowUp") && ctx.optionIds.length && !ctx.answer) {
    event.preventDefault();
    const index = ctx.optionIds.indexOf(ctx.selectedId ?? "");
    const next = Math.max(0, Math.min(ctx.optionIds.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)));
    if (next >= ctx.optionIds.length - 2 && ctx.hasMore) ctx.loadMoreResults();
    ctx.setActiveId(ctx.optionIds[next]!);
    requestAnimationFrame(() => ctx.reveal(ctx.optionIds[next]!));
    return;
  }
  if (event.key !== "Enter" || event.shiftKey) return;
  event.preventDefault();
  ctx.confirmSelection();
}
