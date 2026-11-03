import type { Page } from "@/types";
import type { NotebookCardThemeContext } from "./themes";

export function notebookThemeContextFromPage(
  page?: Pick<Page, "fontFamily"> | null,
): NotebookCardThemeContext {
  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");
  const editorFontSize =
    typeof document === "undefined"
      ? undefined
      : Number.parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--editor-font-size",
          ),
        );
  return {
    fontFamily: page?.fontFamily ?? "default",
    editorFontSize: Number.isFinite(editorFontSize) ? editorFontSize : undefined,
    resolvedTheme: isDark ? "dark" : "light",
  };
}
