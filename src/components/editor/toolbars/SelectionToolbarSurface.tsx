import { forwardRef, type ComponentPropsWithoutRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import "./selection-toolbar.css";

type Props = ComponentPropsWithoutRef<"div"> & {
  context: string;
  variant?: "floating" | "embedded";
};

function navigateToolbar(event: KeyboardEvent<HTMLDivElement>) {
  if (event.defaultPrevented || event.altKey || event.metaKey || event.ctrlKey) return;
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  const target = event.target as HTMLElement;
  if (target.tagName !== "BUTTON") return;
  const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"))
    .filter((button) => button.getClientRects().length > 0 && button.getAttribute("aria-hidden") !== "true");
  const index = buttons.indexOf(target as HTMLButtonElement);
  if (index < 0 || !buttons.length) return;
  const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1
    : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
  event.preventDefault();
  event.stopPropagation();
  buttons[next].focus({ preventScroll: true });
}

export const SelectionToolbarSurface = forwardRef<HTMLDivElement, Props>(
  function SelectionToolbarSurface({ context, variant = "floating", className, onKeyDown, ...props }, ref) {
    return <div {...props} ref={ref} role={props.role ?? "toolbar"}
      data-selection-toolbar={context} data-toolbar-variant={variant}
      className={cn("goose-selection-toolbar", className)}
      onKeyDown={(event) => { onKeyDown?.(event); navigateToolbar(event); }} />;
  },
);
