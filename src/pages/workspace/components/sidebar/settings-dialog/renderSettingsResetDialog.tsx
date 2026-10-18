import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings-dialog/renderSettingsResetDialog.tsx#localMessages:1">`
zh-Hans:
  resetAppData_266d: "确认重置设置？"
  thisWillClearAllInApp_45b2: "将恢复偏好设置。"
  notebooksStay: "不会清理笔记本"
  alsoClear: "同时清空"
  versionHistory: "历史版本"
  aiConversations: "AI 对话"
  typeTheFollowingPhraseToConfirm_a667: "请输入以下短语以确认重置："
  cancel_625f: "取消"
  resetting_567f: "正在重置…"
  reset_80cf: "确认重置"
en:
  resetAppData_266d: "Reset settings?"
  thisWillClearAllInApp_45b2: "Preferences return to their defaults."
  notebooksStay: "Notebooks will not be cleared"
  alsoClear: "Also clear"
  versionHistory: "Version history"
  aiConversations: "AI conversations"
  typeTheFollowingPhraseToConfirm_a667: "Type the following phrase to confirm:"
  cancel_625f: "Cancel"
  resetting_567f: "Resetting…"
  reset_80cf: "Reset"
ja:
  resetAppData_266d: "設定をリセットしますか？"
  thisWillClearAllInApp_45b2: "環境設定を初期状態に戻します。"
  notebooksStay: "ノートブックは消去されません"
  alsoClear: "あわせて消去"
  versionHistory: "バージョン履歴"
  aiConversations: "AI との会話"
  typeTheFollowingPhraseToConfirm_a667: "リセットを確定するには、次のフレーズを入力してください:"
  cancel_625f: "キャンセル"
  resetting_567f: "リセット中…"
  reset_80cf: "リセットする"
`;
const uiText = createTranslator(localMessages);
import { Checkbox } from "@/components/ui/checkbox";
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
    clearHistory,
    setClearHistory,
    clearAiChats,
    setClearAiChats,
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
      bodyClassName="absolute inset-0 overflow-y-auto p-6 animate-in fade-in duration-200"
    >
      <div className="flex min-h-full w-full items-center justify-center">
        <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-[14px] mb-4 bg-[var(--goose-color-danger-subtle-bg)]">
            <GooseIcons.AlertTriangle className="w-7 h-7 text-danger" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {uiText("resetAppData_266d")}</h1>
          <p className="text-muted-foreground">
            {uiText("thisWillClearAllInApp_45b2")}</p>
          <p className="mt-2 text-sm leading-5 text-foreground">
            {uiText("notebooksStay")}</p>
        </div>

        <div className="bg-[var(--goose-color-danger-subtle-bg)] backdrop-blur-[1px] rounded-[14px] p-6 shadow-[0_12px_26px_rgba(15,23,42,0.1)] space-y-4">
          <div className="space-y-3">
            <div className="text-sm font-medium text-danger">{uiText("alsoClear")}</div>
            <Checkbox isSelected={clearHistory} onChange={setClearHistory} isDisabled={resetting} className="items-center gap-2">
              <Checkbox.Control><Checkbox.Indicator /></Checkbox.Control>
              <Checkbox.Content className="text-sm leading-5 text-foreground">{uiText("versionHistory")}</Checkbox.Content>
            </Checkbox>
            <Checkbox isSelected={clearAiChats} onChange={setClearAiChats} isDisabled={resetting} className="items-center gap-2">
              <Checkbox.Control><Checkbox.Indicator /></Checkbox.Control>
              <Checkbox.Content className="text-sm leading-5 text-foreground">{uiText("aiConversations")}</Checkbox.Content>
            </Checkbox>
          </div>
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
      </div>
    </DialogShell>
  );
}
