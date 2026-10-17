import messages from "./documents.yaml";
import { createTranslator } from "@/i18n";
const t = createTranslator(messages);
const names = ["BookOpen", "Book", "BookMarked", "NotebookPen", "Notebook", "Library", "FileText", "Files", "ClipboardList", "Clipboard", "BookText", "NotebookTabs", "ListTodo", "StickyNote", "FileCode", "Terminal", "Database", "ChartNoAxesCombined", "Newspaper", "FileCheck", "FolderOpen", "Folder", "Archive", "Inbox", "FileSpreadsheet", "Mail", "CalendarDays", "Calendar", "Kanban", "ChartGantt", "Presentation", "ReceiptText"] as const;
export const documents = {
  id: "documents" as const,
  label: t("category"),
  icons: names.map((name) => ({ name, label: t(name), keywords: t(`${name}Keywords`) })),
};
