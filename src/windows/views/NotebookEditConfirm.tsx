import { Button } from "@/components/ui/button";
import { AlertTriangle } from "@/components/ui/icons";
import { completeAuxiliary } from "@/windows/AuxiliaryWindowContext";
import type { NotebookEditPayload } from "./notebookEditPayload";

type ConfirmCopy = {
  removeTitle: string;
  deleteTitle: string;
  removeBody: string;
  deleteBody: string;
  pageCount: string;
  back: string;
  confirmRemove: string;
  confirmDelete: string;
};

export function NotebookEditConfirm({
  draft,
  view,
  copy,
  onBack,
}: {
  draft: NotebookEditPayload;
  view: "remove" | "delete";
  copy: ConfirmCopy;
  onBack: () => void;
}) {
  const removing = view === "remove";
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-6 py-7">
        <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-[10px] bg-[var(--goose-color-danger-subtle-bg)] text-danger">
          <AlertTriangle className="h-[18px] w-[18px]" />
        </span>
        <h2 className="m-0 text-[17px] font-semibold text-foreground">
          {removing ? copy.removeTitle : copy.deleteTitle}
        </h2>
        <p className="m-0 text-[13px] leading-5 text-muted-foreground">
          {removing ? copy.removeBody : copy.deleteBody}
        </p>
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3.5 py-3 text-[13px]">
          <span className="min-w-0 truncate text-foreground">{draft.name}</span>
          <span className="goose-tabular shrink-0 text-muted-foreground">{copy.pageCount}</span>
        </div>
      </div>
      <footer className="flex shrink-0 justify-end gap-2 border-t border-border px-4 py-3">
        <Button type="button" variant="outline" size="sm" onClick={onBack}>{copy.back}</Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => void completeAuxiliary("confirmed", { action: view })}
        >
          {removing ? copy.confirmRemove : copy.confirmDelete}
        </Button>
      </footer>
    </div>
  );
}
