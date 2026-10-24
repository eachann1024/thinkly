import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import "./fade-text.css";

/** Two-line preview; only overflowing text fades, without inserting an ellipsis. */
export function FadeText({ children, className }: { children: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setOverflowing(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    // Font loading can change wrapping without changing the clamped box's size.
    let disposed = false;
    const onFontsLoaded = () => { if (!disposed) measure(); };
    void document.fonts?.ready.then(onFontsLoaded);
    document.fonts?.addEventListener("loadingdone", onFontsLoaded);
    return () => {
      disposed = true;
      observer.disconnect();
      document.fonts?.removeEventListener("loadingdone", onFontsLoaded);
    };
  }, [children]);

  return (
    <div ref={ref} className={cn("goose-fade-text", className)} data-overflowing={overflowing || undefined}>
      {children}
    </div>
  );
}
