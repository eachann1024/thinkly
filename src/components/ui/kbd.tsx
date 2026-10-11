import { cn, formatShortcut, type PlatformKind } from "@/lib/utils";

import { type ControlContext } from "./control-recipes";

export interface KbdProps {
  context?: ControlContext;
  variant?: "default" | "chip";
  shortcut: string;
  platform?: PlatformKind;
  className?: string;
}

const kbdRecipes = {
  default: "pointer-events-none inline-flex h-5 select-none items-center rounded-[var(--goose-kbd-radius,var(--radius-md))] border border-border/85 bg-muted/80 px-1.5 font-mono text-[10px] font-medium text-muted-foreground shadow-[inset_0_0_0_1px_hsl(var(--border)/0.35)]",
  chip: "inline-flex items-center rounded-[var(--goose-kbd-chip-radius,6px)] bg-[var(--goose-interactive-hover)] px-2 py-0.5 font-mono text-xs text-muted-foreground",
};

export function Kbd({ shortcut, className, platform, variant = "default", context = "shell" }: KbdProps) {
  return (
    <kbd
      data-goose-control="kbd"
      data-goose-context={context}
      className={cn(
        kbdRecipes[variant],
        className,
      )}
    >
      {formatShortcut(shortcut, platform)}
    </kbd>
  );
}
