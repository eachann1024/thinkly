import { useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import { Check } from "@/components/ui/icons";
import { toCssFontFamily } from "@/lib/fontLoader";
import { cn } from "@/lib/utils";

export type FontListOption = { family: string | null; label: string };
const ROW_HEIGHT = 34;

export function VirtualFontList({
  label,
  options,
  value,
  fallbackFontFamily,
  onPreview,
  onConfirm,
}: {
  label: string;
  options: FontListOption[];
  value: string | null;
  fallbackFontFamily: string;
  onPreview: (font: string | null) => void;
  onConfirm: (font: string | null) => void;
}) {
  "use no memo";
  const id = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeFamily, setActiveFamily] = useState(value);
  const activeIndex = Math.max(0, options.findIndex((option) => option.family === activeFamily));
  const initialIndex = useRef(activeIndex);
  const typeahead = useRef({ text: "", time: 0 });
  // eslint-disable-next-line react-hooks/incompatible-library -- This imperative virtualizer opts out of compiler memoization above.
  const virtualizer = useVirtualizer({
    count: options.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 3,
    initialRect: { width: 0, height: Math.min(options.length * ROW_HEIGHT, 320) },
    initialOffset: initialIndex.current * ROW_HEIGHT,
    // Keep the active descendant accessible when the user scrolls it away.
    rangeExtractor: (range) => {
      const visible = defaultRangeExtractor(range);
      return visible.includes(activeIndex)
        ? visible
        : [...visible, activeIndex].sort((a, b) => a - b);
    },
  });
  useLayoutEffect(() => {
    virtualizer.scrollToIndex(activeIndex, { align: "auto" });
  }, [activeIndex, virtualizer]);
  const names = useMemo(
    () => options.map((option) => option.label.toLocaleLowerCase()),
    [options],
  );
  const moveTo = (index: number, preview: boolean) => {
    setActiveFamily(options[index].family);
    virtualizer.scrollToIndex(index, { align: "auto" });
    if (preview) onPreview(options[index].family);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = options.length - 1;
    const targets: Record<string, number> = {
      ArrowDown: Math.min(last, activeIndex + 1),
      ArrowUp: Math.max(0, activeIndex - 1),
      Home: 0,
      End: last,
      PageDown: Math.min(last, activeIndex + 8),
      PageUp: Math.max(0, activeIndex - 8),
    };
    if (event.key in targets) {
      event.preventDefault();
      moveTo(targets[event.key], true);
    } else if (
      event.key.length === 1 && event.key !== " " &&
      !event.altKey && !event.ctrlKey && !event.metaKey
    ) {
      event.preventDefault();
      const now = performance.now();
      const previous = now - typeahead.current.time < 700 ? typeahead.current.text : "";
      const text = (previous + event.key).toLocaleLowerCase();
      typeahead.current = { text, time: now };
      for (let offset = 1; offset <= options.length; offset++) {
        const index = (activeIndex + offset) % options.length;
        if (names[index].startsWith(text)) {
          moveTo(index, false);
          break;
        }
      }
    }
    // Enter/Space confirmation is handled on keyup by the preview session.
  };

  return (
    <div
      ref={scrollRef}
      role="listbox"
      aria-label={label}
      aria-activedescendant={`${id}-${activeIndex}`}
      data-font-preview={options[activeIndex]?.family ?? ""}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="overflow-y-auto overscroll-contain outline-none"
      style={{
        height: Math.min(options.length * ROW_HEIGHT, 320),
        maxHeight: "calc(var(--goose-popover-available-height, 332px) - 12px)",
      }}
    >
      <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((row) => {
          const option = options[row.index];
          const selected = option.family === value;
          return (
            <button
              key={option.family ?? "__system__"}
              id={`${id}-${row.index}`}
              type="button"
              role="option"
              aria-selected={selected}
              aria-setsize={options.length}
              aria-posinset={row.index + 1}
              tabIndex={-1}
              data-font-preview={option.family ?? ""}
              onPointerMove={() => setActiveFamily(option.family)}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => onConfirm(option.family)}
              className={cn(
                "absolute inset-x-0 top-0 flex w-full cursor-default items-center gap-2 rounded-lg px-2 text-left text-[13px] outline-none",
                row.index === activeIndex && "bg-[var(--goose-interactive-selected)] text-[var(--goose-interactive-selected-fg)]",
              )}
              style={{
                height: ROW_HEIGHT,
                transform: `translateY(${row.start}px)`,
                fontFamily: option.family
                  ? `${toCssFontFamily(option.family)}, ${fallbackFontFamily}`
                  : fallbackFontFamily,
              }}
            >
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {selected && <Check aria-hidden="true" className="size-4 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
