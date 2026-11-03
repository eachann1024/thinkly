import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/** On the window's shell the shared tray tint disappears; deepen it there. */
const ON_SHELL: CSSProperties = {
  ["--goose-segmented-tray-bg" as string]:
    "color-mix(in srgb, hsl(var(--foreground)) 8%, hsl(var(--goose-shell-bg)))",
};

export function SegmentedTrack<T extends string | number>({
  label,
  value,
  options,
  onChange,
  className,
  onShell,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
  onShell?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("goose-segmented-tray flex h-[30px] min-w-0 p-0.5", className)}
      style={onShell ? ON_SHELL : undefined}
    >
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          aria-pressed={option.value === value}
          className="goose-segmented-option min-w-0 flex-1 truncate px-2 text-xs font-medium"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
