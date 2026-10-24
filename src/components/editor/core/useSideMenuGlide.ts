import { useEffect, useState } from "react";

export function useSideMenuGlide(blockId: string | undefined) {
  const [shownBlockId, setShownBlockId] = useState(blockId);
  const [gliding, setGliding] = useState(false);
  if (shownBlockId !== blockId) {
    setShownBlockId(blockId);
    setGliding(Boolean(shownBlockId && blockId));
  }
  useEffect(() => {
    if (!gliding) return;
    const timer = window.setTimeout(() => setGliding(false), 200);
    return () => window.clearTimeout(timer);
  }, [gliding, blockId]);
  return gliding;
}
