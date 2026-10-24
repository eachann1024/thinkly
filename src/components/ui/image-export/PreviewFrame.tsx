import { useLayoutEffect, useRef, type CSSProperties } from "react";

function between(html: string, start: string, end: string): string {
  const from = html.indexOf(start);
  if (from < 0) return "";
  const begin = from + start.length;
  const to = html.indexOf(end, begin);
  return to < 0 ? "" : html.slice(begin, to);
}

function previewMarkup(html: string): string {
  return `<style>${between(html, "<style>", "</style>")}</style>${between(html, "<body>", "</body>")}`;
}

export function PreviewFrame({
  html,
  title,
  className,
  style,
  onHeightChange,
}: {
  html: string;
  title: string;
  className?: string;
  style: CSSProperties;
  onHeightChange?: (height: number) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    root.innerHTML = previewMarkup(html);
    let observer: ResizeObserver | undefined;
    let active = true;
    const measure = () => {
      if (!active || !onHeightChange) return;
      const card = root.querySelector<HTMLElement>(".gooseshot-container");
      if (!card) return;
      const height = Math.ceil(Math.max(card.scrollHeight, card.offsetHeight));
      if (height > 0) onHeightChange(height);
    };
    measure();
    const card = root.querySelector<HTMLElement>(".gooseshot-container");
    if (onHeightChange && card) {
      observer = new ResizeObserver(measure);
      observer.observe(card);
      void document.fonts?.ready.then(measure);
    }
    return () => {
      active = false;
      observer?.disconnect();
    };
  }, [html, onHeightChange]);

  return <div ref={hostRef} aria-label={title} className={className} style={style} />;
}
