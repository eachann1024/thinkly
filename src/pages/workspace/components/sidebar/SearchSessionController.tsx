import { useLocale } from "@/i18n";
import { useEffect, useRef, useState } from "react";
import { useSearchSession } from "./useSearchSession";
import { usePages } from "@/stores/usePages";
import { useTabs } from "@/stores/useTabs";
import { tryShowPageInFocusedSplit } from "@/lib/editor-split/commands";
import { closeNotebookAiIfFullscreen } from "../notebook-ai/useNotebookAiPanel";
import { useCommandSearchIndexWarmup } from "../command/useCommandSearchIndexWarmup";
import { resetSearchCatalog } from "../command/pageSearchCatalog";

const RELEASE_INDEX_MS = 120_000;

export function SearchSessionController() {
  useLocale();
  const searchOpen = useSearchSession((state) => state.view.phase !== "closed");
  const [indexArmed, setIndexArmed] = useState(false);
  if (searchOpen && !indexArmed) setIndexArmed(true);
  useCommandSearchIndexWarmup(indexArmed);
  useEffect(() => {
    if (searchOpen || !indexArmed) return;
    const timer = window.setTimeout(() => {
      resetSearchCatalog();
      setIndexArmed(false);
    }, RELEASE_INDEX_MS);
    return () => window.clearTimeout(timer);
  }, [searchOpen, indexArmed]);
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
