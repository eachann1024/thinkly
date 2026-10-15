import { resolvePageIcon } from "@/lib/resolvePageIcon";
export const renderNotebookIcon = (iconStr: string, className?: string) => {
  const icon = typeof iconStr === "string" ? iconStr : "";
  const IconComp = resolvePageIcon(icon);
  if (IconComp) {
    return <IconComp className={cn("h-4 w-4 stroke-[1.6]", className)} />;
  }
  return (
    <span className={cn("flex items-center justify-center text-base leading-none", className)}>
      {icon || "📓"}
    </span>
  );
};
