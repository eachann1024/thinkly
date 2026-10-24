import { documentTextColors } from "@/lib/textColors";
const OBJECT_REPLACEMENT_CHARACTER = /\uFFFC/g;

export function stripEditorObjectReplacementCharacters(value: string): string {
  return value.replace(OBJECT_REPLACEMENT_CHARACTER, "");
}

export function escapeHtml(value: string): string {
  return stripEditorObjectReplacementCharacters(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const BLOCKNOTE_TEXT_COLORS: Record<string, string> = documentTextColors("light");

export const BLOCKNOTE_BACKGROUND_COLORS: Record<string, string> = {
  gray: "#ebeced",
  brown: "#e9e5e3",
  red: "#fbe4e4",
  orange: "#f6e9d9",
  yellow: "#fbf3db",
  green: "#ddedea",
  blue: "#ddebf1",
  purple: "#eae4f2",
  pink: "#f4dfeb",
};

export const BLOCKNOTE_TEXT_COLORS_DARK: Record<string, string> = documentTextColors("dark");

export const BLOCKNOTE_BACKGROUND_COLORS_DARK: Record<string, string> = {
  gray: "#3d3d3a",
  brown: "#49352c",
  red: "#512b31",
  orange: "#50351f",
  yellow: "#453a1e",
  green: "#253f34",
  blue: "#223f52",
  purple: "#3b3055",
  pink: "#4b2c42",
};

export function resolveExportColor(
  value: unknown,
  palette: Record<string, string>,
): string | null {
  if (typeof value !== "string" || value === "" || value === "default")
    return null;
  return palette[value] || value;
}
