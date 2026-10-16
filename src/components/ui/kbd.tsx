import { Fragment } from "react";
import { cn, formatShortcut, getPlatformKind, type PlatformKind } from "@/lib/utils";

import { type ControlContext } from "./control-recipes";

export interface KbdProps {
  context?: ControlContext;
  variant?: "default" | "chip";
  shortcut: string;
  platform?: PlatformKind;
  className?: string;
}

const kbdRecipes = {
  default: "pointer-events-none inline-flex h-6 select-none items-center gap-[3px] whitespace-nowrap rounded-[var(--goose-kbd-radius,var(--radius-md))] border border-border/85 bg-muted/80 px-1.5 font-sans text-[13px] font-medium text-muted-foreground shadow-[inset_0_0_0_1px_hsl(var(--border)/0.35)]",
  chip: "inline-flex items-center gap-[3px] whitespace-nowrap rounded-[var(--goose-kbd-chip-radius,6px)] bg-[var(--goose-interactive-hover)] px-2 py-0.5 font-sans text-[13px] text-muted-foreground",
};

export function Kbd({ shortcut, className, platform = getPlatformKind(), variant = "default", context = "shell" }: KbdProps) {
  const parts = shortcut.replace(/\+\+$/, "+Plus").split("+");
  return (
    <kbd
      data-goose-control="kbd"
      data-goose-context={context}
      aria-label={formatShortcut(shortcut, platform)}
      className={cn(
        kbdRecipes[variant],
        className,
      )}
    >
      {parts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 && platform !== "mac" && <span aria-hidden="true">+</span>}
          <span aria-hidden="true">{formatShortcut(part, platform)}</span>
        </Fragment>
      ))}
    </kbd>
  );
}
