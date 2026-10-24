import * as GooseIcons from "@/components/ui/icons";
import type { ComponentType, SVGProps } from "react";
type PageIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;
export function resolvePageIcon(name: string | undefined): PageIcon | null {
  if (typeof name !== "string" || !name || name === "Icon") return null;
  const candidate = (GooseIcons as unknown as Record<string, PageIcon>)[name] ?? null;
  const kind = (candidate as { $$typeof?: symbol } | null)?.$$typeof;
  return kind === Symbol.for("react.forward_ref") || kind === Symbol.for("react.memo")
    ? candidate
    : null;
}
