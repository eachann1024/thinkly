import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/components/ui/empty-state.tsx#localMessages:1">`
zh-Hans:
  details: "详情"
en:
  details: "Details"
`;
const uiText = createTranslator(localMessages);
import type { ReactNode } from "react";
import type { GooseIcon } from "./icons";
import { cn } from "@/lib/utils";

/** 缺省态统一为轻量行；详细原因按需展开，不用装饰卡片占用正文。 */
export function EmptyState({
  icon: Icon,
  title,
  action,
  details,
  className,
  role = "status",
}: {
  icon?: GooseIcon;
  title: ReactNode;
  action?: ReactNode;
  details?: string;
  className?: string;
  role?: "status" | "alert";
}) {
  useLocale();
  return (
    <div className={cn("goose-empty-state max-w-full text-xs text-muted-foreground", className)} role={role}>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        {Icon && <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />}
        <p className="min-w-0 leading-5">{title}</p>
        {action}
      </div>
      {details && (
        <details className="mt-2 max-w-sm leading-relaxed">
          <summary className="w-fit cursor-pointer rounded px-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">{uiText("details")}</summary>
          <p className="mt-1 whitespace-pre-wrap break-words">{details}</p>
        </details>
      )}
    </div>
  );
}
