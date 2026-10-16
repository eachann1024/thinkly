import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

/** 保留预览文档和字体，只替换发生变化的卡片区域，避免开关触发 iframe 导航。 */
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
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [initialHtml] = useState(() => html);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    let observer: ResizeObserver | undefined;
    let active = true;
    const measure = () => {
      if (!active) return;
      const card = frame.contentDocument?.querySelector<HTMLElement>(
        ".gooseshot-container",
      );
      if (!card) return;
      const height = Math.ceil(Math.max(card.scrollHeight, card.offsetHeight));
      if (height > 0) onHeightChange?.(height);
    };
    const update = () => {
      const doc = frame.contentDocument;
      const card = doc?.querySelector(".gooseshot-card");
      const stylesheet = doc?.querySelector("style");
      if (!doc || !card || !stylesheet) return;
      const next = new DOMParser().parseFromString(html, "text/html");
      const css = next.querySelector("style")?.textContent ?? "";
      if (stylesheet.textContent !== css) stylesheet.textContent = css;
      for (const region of ["header", "content", "watermark"]) {
        const selector = `.gooseshot-${region}`;
        const current = card.querySelector(selector);
        const replacement = next.querySelector(selector);
        if (current?.outerHTML === replacement?.outerHTML) continue;
        if (current) {
          if (replacement) current.replaceWith(replacement);
          else current.remove();
        } else if (replacement) {
          if (region === "header") card.prepend(replacement);
          else card.append(replacement);
        }
      }
      measure();
      observer?.disconnect();
      if (onHeightChange) {
        observer = new ResizeObserver(measure);
        observer.observe(doc.body);
        void doc.fonts.ready.then(measure);
      }
    };
    frame.addEventListener("load", update);
    update();
    return () => {
      active = false;
      frame.removeEventListener("load", update);
      observer?.disconnect();
    };
  }, [html, onHeightChange]);

  return (
    <iframe
      ref={frameRef}
      title={title}
      srcDoc={initialHtml}
      sandbox="allow-same-origin"
      className={className}
      style={style}
    />
  );
}
