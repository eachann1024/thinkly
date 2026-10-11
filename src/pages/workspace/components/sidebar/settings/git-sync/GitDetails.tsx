import { useId, useState, type ReactNode } from "react";
import { ChevronRight } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

export function GitDetails({
  title,
  children,
  className = "",
  description,
  spacious = false,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  description?: string;
  spacious?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const contentId = useId();
  return (
    <div className={className}>
      <Button
        type="button"
        variant="ghost"
        className={
          "h-auto w-full justify-between gap-3 rounded-lg text-left text-inherit " +
          (spacious ? "min-h-[64px] px-5 py-4" : "min-h-[44px] px-3 py-2")
        }
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen(!open)}
      >
        <span className="min-w-0 flex-1">
          <span className={spacious ? "block text-base font-semibold" : "block text-[15px]"}>{title}</span>
          {description && <span className="mt-1 block text-sm font-normal text-muted-foreground">{description}</span>}
        </span>
        <ChevronRight
          aria-hidden="true"
          className={"size-4 shrink-0 transition-transform motion-reduce:transition-none " + (open ? "rotate-90" : "")}
        />
      </Button>
      <div id={contentId} hidden={!open}>
        {children}
      </div>
    </div>
  );
}
