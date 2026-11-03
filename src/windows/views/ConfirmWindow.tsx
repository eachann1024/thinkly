import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n/core";
import { completeAuxiliary, useAuxiliaryWindow } from "@/windows/AuxiliaryWindowContext";
import { StandaloneWindowShell } from "@/windows/shell/StandaloneWindowShell";
import { readConfirmPayload, type ConfirmValues } from "./confirmPayload";

const text = createTranslator(i18nYaml<"src/windows/views/ConfirmWindow.tsx#block1:1">`
zh-Hans:
  windowTitle: "确认"
  cancel: "取消"
  phraseHint: "请输入以下短语以确认："
  esc: "Esc 取消"
en:
  windowTitle: "Confirm"
  cancel: "Cancel"
  phraseHint: "Type the following phrase to confirm:"
  esc: "Esc cancels"
ja:
  windowTitle: "確認"
  cancel: "キャンセル"
  phraseHint: "確定するには次のフレーズを入力してください："
  esc: "Esc でキャンセル"
`);

export function ConfirmWindow() {
  useLocale();
  const { payload, requestId, resizable } = useAuxiliaryWindow();
  const request = readConfirmPayload(payload);
  const checkboxes = request?.checkboxes ?? [];
  const [typed, setTyped] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const next = readConfirmPayload(payload);
    setTyped("");
    setChecks(Object.fromEntries((next?.checkboxes ?? []).map((box) => [box.id, box.checked === true])));
  }, [requestId, payload]);

  if (!request) return null;
  const locked = request.phrase !== undefined && typed.trim() !== request.phrase;
  const confirm = () => {
    if (locked) return;
    const values: ConfirmValues = { checks };
    void completeAuxiliary("confirmed", values);
  };

  return (
    <StandaloneWindowShell title={text("windowTitle")} context={text("esc")} maximizable={resizable}>
      <form
        className="flex h-full min-h-0 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          confirm();
        }}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-5 pt-5">
          <div>
            <h2 className="m-0 text-base font-semibold text-foreground">{request.title}</h2>
            {request.body ? (
              <p className="m-0 mt-1.5 whitespace-pre-wrap break-words text-[13px] leading-5 text-muted-foreground">
                {request.body}
              </p>
            ) : null}
          </div>
          {checkboxes.length > 0 ? (
            <div className="flex flex-col gap-2">
              {checkboxes.map((box) => (
                <Checkbox
                  key={box.id}
                  isSelected={checks[box.id] === true}
                  onChange={(checked: boolean) => setChecks((current) => ({ ...current, [box.id]: checked }))}
                  className="items-center gap-2"
                >
                  <Checkbox.Control><Checkbox.Indicator /></Checkbox.Control>
                  <Checkbox.Content className="text-[13px] leading-5 text-foreground">{box.label}</Checkbox.Content>
                </Checkbox>
              ))}
            </div>
          ) : null}
          {request.phrase !== undefined ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm-phrase" className="text-xs text-muted-foreground">
                {text("phraseHint")}{" "}
                <b className="select-text font-semibold text-foreground">{request.phrase}</b>
              </label>
              <Input
                id="confirm-phrase"
                value={typed}
                autoComplete="off"
                autoFocus
                controlSize="compact"
                onChange={(event) => setTyped(event.target.value)}
              />
            </div>
          ) : null}
        </div>
        <footer className="flex shrink-0 justify-end gap-2 border-t border-border px-4 py-3">
          <Button type="button" variant="outline" size="sm" onClick={() => void completeAuxiliary("cancelled")}>
            {text("cancel")}
          </Button>
          <Button type="submit" size="sm" variant={request.danger ? "destructive" : "default"} disabled={locked}>
            {request.confirmLabel}
          </Button>
        </footer>
      </form>
    </StandaloneWindowShell>
  );
}
