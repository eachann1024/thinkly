export type NotebookEditPayload = {
  id: string;
  name: string;
  icon: string;
  excludeFromGlobalSearch: boolean;
  isLocalFolder: boolean;
  pageCount: number;
};

export type NotebookEditSaveValues = {
  action: "save";
  name: string;
  icon: string;
  excludeFromGlobalSearch: boolean;
};

export type NotebookEditRemoveValues = {
  action: "remove" | "delete";
};

export type NotebookEditValues = NotebookEditSaveValues | NotebookEditRemoveValues;

export function readNotebookEditPayload(value: unknown): NotebookEditPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string" || !raw.id || typeof raw.name !== "string") return null;
  return {
    id: raw.id,
    name: raw.name,
    icon: typeof raw.icon === "string" ? raw.icon : "",
    excludeFromGlobalSearch: raw.excludeFromGlobalSearch === true,
    isLocalFolder: raw.isLocalFolder === true,
    pageCount: typeof raw.pageCount === "number" && Number.isFinite(raw.pageCount)
      ? Math.max(0, Math.round(raw.pageCount))
      : 0,
  };
}

export function readNotebookEditValues(value: unknown): NotebookEditValues | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (raw.action === "remove" || raw.action === "delete") return { action: raw.action };
  if (raw.action !== "save" || typeof raw.name !== "string") return null;
  return {
    action: "save",
    name: raw.name,
    icon: typeof raw.icon === "string" ? raw.icon : "",
    excludeFromGlobalSearch: raw.excludeFromGlobalSearch === true,
  };
}
