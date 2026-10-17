import { documents } from "./notebook-icons/documents";
import { symbols } from "./notebook-icons/symbols";
import { things } from "./notebook-icons/things";
export interface NotebookIcon {
  name: string;
  label: string;
  keywords?: string;
}

export type NotebookIconCategoryId = "documents" | "symbols" | "things";
export type NotebookIconFilter = NotebookIconCategoryId | "all";

export const NOTEBOOK_ICON_CATEGORIES = [documents, symbols, things];

export const NOTEBOOK_ICONS = NOTEBOOK_ICON_CATEGORIES.flatMap((category) =>
  category.icons.map((icon) => ({
    ...icon, category: category.id,
    get label() { return icon.label; },
    get keywords() { return icon.keywords; },
  })),
);

export const getNotebookIconCategory = (value: string): NotebookIconFilter =>
  NOTEBOOK_ICONS.find((icon) => icon.name === value)?.category ?? "all";

export function filterNotebookIcons(query: string, category: NotebookIconFilter) {
  const terms = query.normalize("NFKC").trim().toLowerCase().split(/\s+/).filter(Boolean);
  return NOTEBOOK_ICONS.filter((icon) => {
    if (category !== "all" && icon.category !== category) return false;
    const keywords = `${icon.name} ${icon.label} ${icon.keywords ?? ""}`.toLowerCase();
    return terms.every((term) => keywords.includes(term));
  });
}
