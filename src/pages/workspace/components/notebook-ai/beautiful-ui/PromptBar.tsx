import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PromptBar({ streaming, children, className }: {
  streaming?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("bui-prompt-bar", className)}
    data-streaming={streaming ? "true" : undefined}>
    {children}
  </div>;
}
