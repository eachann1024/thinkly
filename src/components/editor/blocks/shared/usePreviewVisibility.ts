import { useEffect, useRef, useState } from "react";

/** Activate a preview once it approaches the viewport; keep it mounted after scrolling away. */
export function usePreviewVisibility<T extends HTMLElement = HTMLDivElement>(eager = false) {
  const previewRef = useRef<T>(null);
  const [seen, setSeen] = useState(() => eager || typeof IntersectionObserver === "undefined");
  const activated = eager || seen;

  useEffect(() => {
    const node = previewRef.current;
    if (!node || activated) return;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      setSeen(true);
      observer.disconnect();
    }, { rootMargin: "320px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [activated]);

  return { previewRef, activated };
}
