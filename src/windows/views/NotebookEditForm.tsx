import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { NotebookIconSelector } from "@/pages/workspace/components/sidebar/NotebookIconSelector";
import { completeAuxiliary } from "@/windows/AuxiliaryWindowContext";
import type { NotebookEditPayload } from "./notebookEditPayload";

type EditCopy = {
  intro: string;
  nameLabel: string;
  namePlaceholder: string;
  excludeTitle: string;
  excludeBody: string;
  dangerTitle: string;
  dangerHint: string;
  remove: string;
  delete: string;
  cancel: string;
  save: string;
  changeIcon: string;
};

export function NotebookEditForm({
  draft,
  copy,
  onChange,
  onAsk,
}: {
  draft: NotebookEditPayload;
  copy: EditCopy;
  onChange: (patch: Partial<NotebookEditPayload>) => void;
  onAsk: (view: "remove" | "delete") => void;
}) {
  const empty = !draft.name.trim();
  const save = () => {
    if (empty) return;
    void completeAuxiliary("confirmed", {
      action: "save",
      name: draft.name.trim(),
      icon: draft.icon,
      excludeFromGlobalSearch: draft.excludeFromGlobalSearch,
    });
  };

  return (
    <form
      className="flex h-full min-h-0 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">
        <p className="m-0 text-[13px] text-muted-foreground">{copy.intro}</p>
        <div className="flex flex-col gap-2">
          <label htmlFor="notebook-name" className="text-xs font-medium text-muted-foreground">{copy.nameLabel}</label>
          <div className="flex items-center gap-2">
            <span className="inline-flex shrink-0 [&_.notebook-icon-selector-trigger]:h-10 [&_.notebook-icon-selector-trigger]:w-10 [&_.notebook-icon-selector-trigger]:rounded-lg [&_.notebook-icon-selector-preview]:h-5 [&_.notebook-icon-selector-preview]:w-5">
              <NotebookIconSelector
                value={draft.icon}
                defaultIcon={draft.isLocalFolder ? "FolderOpen" : "BookOpen"}
                onChange={(icon) => onChange({ icon })}
                container={typeof document === "undefined" ? null : document.body}
                label={copy.changeIcon}
              />
            </span>
            <Input
              id="notebook-name"
              value={draft.name}
              autoFocus
              placeholder={copy.namePlaceholder}
              className="h-10"
              onChange={(event) => onChange({ name: event.target.value })}
            />
          </div>
        </div>
        <div className="flex items-start gap-4 rounded-[10px] border border-border bg-muted/40 px-3.5 py-3.5">
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-foreground">{copy.excludeTitle}</span>
            <span className="mt-1 block text-xs leading-[18px] text-muted-foreground">{copy.excludeBody}</span>
          </span>
          <Switch
            checked={draft.excludeFromGlobalSearch}
            aria-label={copy.excludeTitle}
            className="mt-0.5"
            onCheckedChange={(checked) => onChange({ excludeFromGlobalSearch: checked })}
          />
        </div>
        <div className="flex-1" />
        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[13px] font-semibold text-foreground">{copy.dangerTitle}</span>
            <span className="text-xs text-muted-foreground">{copy.dangerHint}</span>
          </span>
          <Button type="button" variant="ghost" size="sm" className="shrink-0 text-danger" onClick={() => onAsk(draft.isLocalFolder ? "remove" : "delete")}>
            {draft.isLocalFolder ? copy.remove : copy.delete}
          </Button>
        </div>
      </div>
      <footer className="flex shrink-0 justify-end gap-2 border-t border-border px-4 py-3">
        <Button type="button" variant="outline" size="sm" onClick={() => void completeAuxiliary("cancelled")}>{copy.cancel}</Button>
        <Button type="submit" size="sm" disabled={empty}>{copy.save}</Button>
      </footer>
    </form>
  );
}
