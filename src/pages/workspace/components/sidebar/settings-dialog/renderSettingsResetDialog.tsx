import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings-dialog/renderSettingsResetDialog.tsx#localMessages:1">`
zh-Hans:
  resetAppData_266d: "确认重置应用数据？"
  thisWillClearAllInApp_45b2: "此操作将清空应用内的所有笔记本、历史版本、AI 对话及偏好设置（您硬盘上的本地文件夹文件不受影响）。"
  typeTheFollowingPhraseToConfirm_a667: "请输入以下短语以确认重置："
  cancel_625f: "取消"
  resetting_567f: "正在重置…"
  reset_80cf: "确认重置"
en:
  resetAppData_266d: "Reset app data?"
  thisWillClearAllInApp_45b2: "This will clear all in-app notebooks, version history, AI conversations, and preferences. Files in your local folders on disk are not affected."
  typeTheFollowingPhraseToConfirm_a667: "Type the following phrase to confirm:"
  cancel_625f: "Cancel"
  resetting_567f: "Resetting…"
  reset_80cf: "Reset"
`;
const uiText = createTranslator(localMessages);
import * as GooseIcons from "@/components/ui/icons";
import type { useSettingsResetActions } from "./useSettingsResetActions";

export function renderSettingsResetDialog(
  context: ReturnType<typeof useSettingsResetActions>,
) {
  const {
    open,
    onOpenChange,
    resetDialogOpen,
    onResetDialogOpenChange,
    resetInput,
    setResetInput,
    resetting,
    resetPhrase,
    canReset,
    handleManualReset,
  } = context;
  return (
    <DialogShell
      open={open && resetDialogOpen}
      onOpenChange={onResetDialogOpenChange}
      layout="fullscreen"
      contentClassName="bg-[hsl(var(--goose-shell-bg))]"
      bodyClassName="relative h-full overflow-y-auto p-6 animate-in fade-in duration-200"
    >
      <div className="relative mx-auto w-full max-w-md py-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-[14px] mb-4 bg-[var(--goose-color-danger-subtle-bg)]">
            <GooseIcons.AlertTriangle className="w-7 h-7 text-danger" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {uiText("resetAppData_266d")}</h1>
          <p className="text-muted-foreground">
            {uiText("thisWillClearAllInApp_45b2")}</p>
        </div>

        <div className="bg-[var(--goose-color-danger-subtle-bg)] backdrop-blur-[1px] rounded-[14px] p-6 shadow-[0_12px_26px_rgba(15,23,42,0.1)] space-y-4">
          <div className="space-y-3">
            <div className="text-sm font-medium text-danger select-none">
              {uiText("typeTheFollowingPhraseToConfirm_a667")}<span className="ml-1 select-text font-bold text-foreground">
                {resetPhrase}
              </span>
            </div>
            <Input
              id="reset-all"
              value={resetInput}
              onChange={(e) => setResetInput(e.target.value)}
              placeholder={resetPhrase}
              className="h-12 text-base"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && canReset && !resetting) {
                  void handleManualReset();
                }
              }}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => onResetDialogOpenChange(false)}
              className="flex-1"
            >
              {uiText("cancel_625f")}</Button>
            <Button
              variant="destructive"
              size="lg"
              onClick={() => void handleManualReset()}
              disabled={!canReset || resetting}
              className="flex-1"
            >
              {resetting ? uiText("resetting_567f") : uiText("reset_80cf")}
            </Button>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
