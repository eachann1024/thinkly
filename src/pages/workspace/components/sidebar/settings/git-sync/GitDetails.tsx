import { useId, useState, type ReactNode } from "react";
import { ChevronRight } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

export function GitDetails({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const contentId = useId();
  return (
    <div className={className}>
      <Button
        variant="ghost"
        size="sm"
        className="h-auto justify-start px-0 text-inherit"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen(!open)}
      >
        <ChevronRight
          aria-hidden="true"
          className={
            "size-3.5 shrink-0 transition-transform motion-reduce:transition-none " + (open ? "rotate-90" : "")
          }
        />
        {title}
      </Button>
      <div id={contentId} hidden={!open}>
        {children}
      </div>
    </div>
  );
}
