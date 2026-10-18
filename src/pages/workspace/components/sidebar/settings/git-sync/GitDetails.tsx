import { useId, useState, type ReactNode } from "react";
import { ChevronRight } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

export function GitDetails({
  title,
  children,
  className = "",
  description,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  description?: string;
}) {
  const [open, setOpen] = useState(false);
  const contentId = useId();
  return (
    <div className={className}>
      <Button
        type="button"
        variant="ghost"
        contentStyle="preserve"
        className={
          "group relative flex w-full items-center justify-between gap-3 border-0 text-left text-inherit goose-settings-option-row" +
          (description ? " goose-settings-option-row--stack" : "")
        }
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen(!open)}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-normal leading-5">{title}</span>
          {description ? (
            <span className="mt-1 block text-[13px] leading-5 text-muted-foreground">
              {description}
            </span>
          ) : null}
        </span>
        <ChevronRight
          aria-hidden="true"
          className={
            "size-4 shrink-0 self-center transition-transform motion-reduce:transition-none " +
            (open ? "rotate-90" : "")
          }
        />
      </Button>
      <div id={contentId} hidden={!open}>
        {children}
      </div>
    </div>
  );
}
