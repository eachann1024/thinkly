import { Activity, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./navigation-motion.css";

export function WorkspaceViewActivity({
  visible,
  children,
  className,
  keepAlive = true,
}: {
  visible: boolean;
  children: ReactNode;
  className?: string;
  keepAlive?: boolean;
}) {
  const [visited, setVisited] = useState(visible);
  if (visible && !visited) setVisited(true);
  if (!keepAlive && !visible) {
    if (visited) setVisited(false);
    return null;
  }
  if (!visible && !visited) return null;

  return (
    <Activity mode={visible ? "visible" : "hidden"}>
      <div
        className={cn("workspace-view-enter", className)}
        hidden={!visible}
        inert={!visible}
        aria-hidden={!visible}
      >
        {children}
      </div>
    </Activity>
  );
}
