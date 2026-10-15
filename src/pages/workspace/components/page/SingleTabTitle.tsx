import type { Page } from "@/types";
import { getPageTitle } from "@/components/editor/utils/page-title";

export function SingleTabTitle({ page, surface = "page-header" }: {
  page: Page;
  idleWindowDrag?: boolean;
  surface?: "page-header" | "tab-pill";
}) {
  const title = getPageTitle(page);
  return (
    <span data-page-title-surface={surface} title={title}
      className={`inline-flex h-8 min-w-0 w-full flex-1 items-center truncate text-sm leading-normal ${surface === "tab-pill" ? "text-inherit" : "px-2 font-semibold text-foreground"}`}>
      {title}
    </span>
  );
}
