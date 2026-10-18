import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/components/ui/empty-state.tsx#localMessages:1">`
zh-Hans:
  details: "详情"
en:
  details: "Details"
ja:
  details: "詳細"
`;
const uiText = createTranslator(localMessages);
import type { ReactNode } from "react";
import type { GooseIcon } from "./icons";
import { cn } from "@/lib/utils";

/** 缺省态统一为轻量行；详细原因按需展开。传入 illustration 时点阵插画置于上方并替代图标。 */
export function EmptyState({
  icon: Icon,
  illustration,
  title,
  action,
  details,
  className,
  role = "status",
}: {
  icon?: GooseIcon;
  illustration?: ReactNode;
  title: ReactNode;
  action?: ReactNode;
  details?: string;
  className?: string;
  role?: "status" | "alert";
}) {
  useLocale();
  return (
    <div
      className={cn("goose-empty-state max-w-full text-xs text-muted-foreground", illustration && "flex flex-col items-center", className)}
      role={role}
    >
      {illustration && <div className="mb-2.5 flex justify-center" aria-hidden="true">{illustration}</div>}
      <div className={cn("flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1", illustration && "justify-center")}>
        {!illustration && Icon && <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />}
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
