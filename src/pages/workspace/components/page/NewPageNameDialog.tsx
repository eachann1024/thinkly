import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useImeInput } from "@/hooks/useImeInput";
import { useNotebooks } from "@/stores/useNotebooks";
import { finishNewPageName, normalizeNewFileName, useNewPageName } from "@/lib/new-page-name";

export function NewPageNameDialog() {
  const request = useNewPageName((state) => state.request);
  return request ? <NameInput key={request.workspaceId} request={request} /> : null;
}

function NameInput({ request }: { request: NonNullable<ReturnType<typeof useNewPageName.getState>["request"]> }) {
  const { value, valueRef, inputProps, isComposing } = useImeInput("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const notebookId = useNotebooks((state) => state.activeNotebookId);
  useEffect(() => {
    if (notebookId !== request.workspaceId && !busyRef.current) finishNewPageName(request, null);
  }, [notebookId, request]);

  const commit = async () => {
    if (busyRef.current) return;
    try {
      const name = normalizeNewFileName(valueRef.current);
      busyRef.current = true;
      setBusy(true);
      const id = await request.create(name);
      if (!id) throw new Error("创建失败，请检查文件夹及写入权限后重试");
      finishNewPageName(request, id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "创建失败，请重试");
    } finally {
      busyRef.current = false;
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  return (
    <Dialog open onOpenChange={(open) => {
      if (!open && !busyRef.current) finishNewPageName(request, null);
    }}>
      <DialogContent hideClose aria-describedby={undefined} className="max-w-sm gap-4 p-5">
        <DialogTitle>新建文件</DialogTitle>
        <Input ref={inputRef} autoFocus value={value} {...inputProps}
          aria-label="文件名称" aria-invalid={Boolean(error)} readOnly={busy}
          onKeyDownCapture={(event) => {
            if (isComposing(event) && event.key === "Escape") event.stopPropagation();
          }}
          onKeyDown={(event) => {
            if (isComposing(event)) return;
            if (event.key === "Enter") {
              event.preventDefault();
              event.stopPropagation();
              void commit();
            }
          }} />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
