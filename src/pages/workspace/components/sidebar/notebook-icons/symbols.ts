import messages from "./symbols.yaml";
import { createTranslator } from "@/i18n";
const t = createTranslator(messages);
const names = ["Bookmark", "Tag", "Sparkles", "Atom", "Dna", "Sigma", "Pi", "Binary", "Target", "Flag", "Milestone", "CircleCheckBig", "MapPin", "Heart", "Star", "Footprints", "Waves", "BadgeDollarSign", "Music", "PawPrint", "CircleAlert", "CircleHelp", "Info", "CircleX", "Ban", "Plus", "Minus", "Check", "X", "Hash", "AtSign", "Percent", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Circle", "Square", "Triangle", "Diamond"] as const;
export const symbols = {
  id: "symbols" as const,
  label: t("category"),
  icons: names.map((name) => ({ name, label: t(name), keywords: t(`${name}Keywords`) })),
};
