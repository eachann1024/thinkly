import { renderNotebookIcon } from "@/pages/workspace/components/sidebar/notebookUtils";
import { notebookMarkColor, notebookMarkGlyph } from "./notebookMarkColor";

export function NotebookMark({
  notebook,
}: {
  notebook: { id: string; name: string; icon?: string };
}) {
  const icon = notebook.icon?.trim();
  return (
    <span
      className="editor-split-notebook-mark"
      style={{ background: notebookMarkColor(notebook.id) }}
      aria-hidden="true"
    >
      {icon ? renderNotebookIcon(icon) : notebookMarkGlyph(notebook.name)}
    </span>
  );
}
