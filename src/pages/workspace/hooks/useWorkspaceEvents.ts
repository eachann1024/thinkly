import { useEffect, useRef } from "react";
import "@/components/ui/sonner";
import "@/stores/usePages";
import { useSettings } from "@/stores/useSettings";

interface UseWorkspaceEventsOptions {
  activePageId: string | null | undefined;
  page: unknown;
}

export function useWorkspaceEvents({
  activePageId,
  page,
}: UseWorkspaceEventsOptions) {
  const { ai } = useSettings();
  const lastViewedPageIdRef = useRef<string | null>(null);

  void ai;

  useEffect(() => {
    if (!activePageId || !page) {
      lastViewedPageIdRef.current = null;
      return;
    }
    lastViewedPageIdRef.current = activePageId;
  }, [activePageId, page]);
}
