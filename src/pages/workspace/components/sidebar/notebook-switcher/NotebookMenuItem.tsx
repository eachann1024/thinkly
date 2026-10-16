import type { ReactNode } from "react";
import { NotebookName } from "./NotebookName";

export const notebookMenuRowClassName =
  "goose-list-row goose-accent-selection goose-notebook-row relative flex w-full cursor-pointer select-none items-center outline-none";

export function NotebookMenuItemContent({
  icon,
  name,
  children,
}: {
  icon: ReactNode;
  name: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <span className="goose-notebook-monogram goose-notebook-icon" aria-hidden="true">
        {icon}
      </span>
      <NotebookName name={name} />
      {children}
    </div>
  );
}
