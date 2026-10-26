import { useEffect, useState } from "react";
import { useSearchSession } from "../sidebar/useSearchSession";
import { getLoadedSearchSheet, loadSearchSheet, preloadSearchSheet } from "./searchSheetLoader";

export function LazySearchSheet(props: { aiNotebookId: string | null }) {
  const open = useSearchSession((state) => state.view.phase !== "closed");
  const [everOpened, setEverOpened] = useState(false);
  const [resolved, setResolved] = useState(getLoadedSearchSheet);
  const [loadError, setLoadError] = useState<unknown>(null);
  const ready = resolved ?? getLoadedSearchSheet();
  useEffect(() => {
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(preloadSearchSheet, { timeout: 1500 });
      return () => cancelIdleCallback(id);
    }
    const id = window.setTimeout(preloadSearchSheet, 1500);
    return () => window.clearTimeout(id);
  }, []);
  useEffect(() => {
    if (!open || ready) return;
    let cancelled = false;
    void loadSearchSheet().then((module) => {
      if (!cancelled) setResolved(module);
    }).catch((error: unknown) => {
      if (!cancelled) setLoadError(error);
    });
    return () => { cancelled = true; };
  }, [open, ready]);
  if (open && !everOpened) setEverOpened(true);
  if (loadError) throw loadError;
  if (!everOpened || !ready) return null;
  const SearchSheet = ready.default;
  return <SearchSheet {...props} />;
}
