import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ExecutionDisclosure({
  open,
  id,
  className,
  children,
}: {
  open: boolean;
  id: string;
  className?: string;
  children: ReactNode;
}) {
  const [hasOpened, setHasOpened] = useState(open);

  useEffect(() => {
    if (open) setHasOpened(true);
  }, [open]);

  return (
    <div
      id={id}
      className={cn("notebook-ai-execution-disclosure", className)}
      aria-hidden={!open}
      inert={!open}
    >
      <div className="notebook-ai-execution-disclosure-clip">
        {open || hasOpened ? (
          <div className="notebook-ai-execution-disclosure-content">{children}</div>
        ) : null}
      </div>
    </div>
  );
}
