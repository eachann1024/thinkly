import { useEffect, useRef, useState } from "react";

/** Keep mounted previews, and optionally track near-viewport changes to cancel queued work. */
export function usePreviewVisibility<T extends HTMLElement = HTMLDivElement>(eager = false, trackVisibility = false) {
  const previewRef = useRef<T>(null);
  const [seen, setSeen] = useState(() => eager || typeof IntersectionObserver === "undefined");
  const [near, setNear] = useState(() => eager || typeof IntersectionObserver === "undefined");
  const activated = eager || seen;
  useEffect(() => {
    const node = previewRef.current;
    if (!node || (activated && !trackVisibility) || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(entries => {
      const visible = entries.some(entry => entry.isIntersecting);
      if (trackVisibility) setNear(visible);
      if (!visible) return;
      setSeen(true);
      if (!trackVisibility) observer.disconnect();
    }, { rootMargin: "320px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [activated, trackVisibility]);
  return { previewRef, activated, near: trackVisibility ? near : activated };
}
