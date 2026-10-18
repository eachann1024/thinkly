import { Activity, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./navigation-motion.css";

/** 首次访问才挂载，隐藏时保留界面状态并暂停副作用。 */
export function WorkspaceViewActivity({
  visible,
  children,
  className,
  keepAlive = true,
}: {
  visible: boolean;
  children: ReactNode;
  className?: string;
  /** 对话框关掉后卸掉已访问页，避免设置里每个 Tab 一直留在内存里。 */
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
