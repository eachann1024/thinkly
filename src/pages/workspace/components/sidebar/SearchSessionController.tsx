import { useEffect, useRef } from "react";
import { useSearchSession } from "./useSearchSession";
import { usePages } from "@/stores/usePages";
import { useTabs } from "@/stores/useTabs";
import { tryShowPageInFocusedSplit } from "@/lib/editor-split/commands";
import { closeNotebookAiIfFullscreen } from "../notebook-ai/useNotebookAiPanel";
import { useCommandSearchIndexWarmup } from "../command/useCommandSearchIndexWarmup";

export function SearchSessionController() {
  useCommandSearchIndexWarmup();
  const nonce = useSearchSession(s => s.navigation.phase === "target" ? s.navigation.id : 0);
  const handled = useRef(0);
  useEffect(() => {
    if (!nonce || nonce === handled.current) return;
    handled.current = nonce;
    const navigation = useSearchSession.getState().navigation;
    if (navigation.phase !== "target" || !usePages.getState().pages[navigation.pageId]) return;
    closeNotebookAiIfFullscreen();
    if (!tryShowPageInFocusedSplit(navigation.pageId)) useTabs.getState().openPreviewTab(navigation.pageId);
    usePages.getState().setExpandPageId(navigation.pageId);
  }, [nonce]);
  return null;
}
