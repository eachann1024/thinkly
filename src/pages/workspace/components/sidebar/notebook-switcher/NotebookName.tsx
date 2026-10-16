import { useLayoutEffect, useRef, useState } from "react";

export function NotebookName({ name }: { name: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setOverflowing(element.scrollWidth > element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [name]);

  return (
    <span
      ref={ref}
      className="goose-notebook-name"
      data-overflow={overflowing || undefined}
      title={name}
    >
      {name}
    </span>
  );
}
