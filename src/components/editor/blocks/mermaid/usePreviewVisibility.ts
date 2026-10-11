import { useEffect, useRef, useState } from "react";

/** Activate a preview once it approaches the viewport; keep it mounted after scrolling away. */
export function usePreviewVisibility() {
  const previewRef = useRef<HTMLDivElement>(null);
  const [activated, setActivated] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    const node = previewRef.current;
    if (!node || activated) return;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      setActivated(true);
      observer.disconnect();
    }, { rootMargin: "320px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [activated]);

  return { previewRef, activated };
}
