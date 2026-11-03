import { cn } from "@/lib/utils";

export function SegmentedTrack<T extends string | number>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex h-[26px] min-w-0 rounded-md bg-muted p-0.5", className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={selected}
            className={cn(
              "min-w-0 flex-1 truncate rounded px-2 text-xs",
              selected
                ? "bg-[var(--goose-menu-surface)] text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
