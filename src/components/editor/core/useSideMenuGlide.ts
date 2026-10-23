import { useEffect, useState } from "react";

// 只在换块时过渡位置；滚动和尺寸变化要立即跟手。
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
