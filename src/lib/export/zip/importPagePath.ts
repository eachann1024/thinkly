export function isImportableNotebookPagePath(path: string): boolean {
  if (path.includes("\\")) return false;
  const parts = path.split("/");
  return (
    parts.length >= 2 &&
    parts.every((part) => Boolean(part) && !part.startsWith(".")) &&
    parts[0] !== "assets" &&
    parts[1] !== "assets" &&
    /\.(?:md|json)$/i.test(parts.at(-1)!)
  );
}
