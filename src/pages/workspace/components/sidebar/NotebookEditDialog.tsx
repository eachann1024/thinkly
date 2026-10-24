import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/NotebookEditDialog.tsx#localMessages:1">`
zh-Hans:
  removeLocalFolder_505d: "移除本地文件夹"
  permanentlyDeleteNotebook_f65f: "永久删除笔记本"
  editNotebook_ed4e: "编辑笔记本"
  thisOnlyRemovesTheFolderFrom_f45b: "仅移除挂载，不会删除磁盘上的文件"
  thisActionCannotBeUndone_a002: "此操作无法撤销，请谨慎操作"
  changeTheNotebookNameIconAnd_0816: "修改笔记本的名称、图标与搜索设置"
  remove_e2cf: "确认移除"
  delete_631c: "确认删除"
  cancel_625f: "取消"
  notebookName_1be5: "笔记本名称"
  enterANotebookName_9843: "输入笔记本名称"
  excludeFromGlobalSearch_0025: "不在全局搜索中展示"
  excludeThisNotebookWhenSearchingAll_add2: "开启后，从其他笔记本搜索「所有笔记本」时排除该笔记本；当前笔记本内搜索不受影响。"
  removeThisNotebook_54d3: "移除此笔记本"
  deleteThisNotebook_8601: "删除此笔记本"
  save_be5f: "保存"
en:
  removeLocalFolder_505d: "Remove local folder"
  permanentlyDeleteNotebook_f65f: "Permanently delete notebook"
  editNotebook_ed4e: "Edit notebook"
  thisOnlyRemovesTheFolderFrom_f45b: "This only removes the folder from the app. Files on disk are kept."
  thisActionCannotBeUndone_a002: "This action cannot be undone."
  changeTheNotebookNameIconAnd_0816: "Change the notebook name, icon, and search settings"
  remove_e2cf: "Remove"
  delete_631c: "Delete"
  cancel_625f: "Cancel"
  notebookName_1be5: "Notebook name"
  enterANotebookName_9843: "Enter a notebook name"
  excludeFromGlobalSearch_0025: "Exclude from global search"
  excludeThisNotebookWhenSearchingAll_add2: "Exclude this notebook when searching all notebooks from another notebook. Searching within this notebook is unaffected."
  removeThisNotebook_54d3: "Remove this notebook"
  deleteThisNotebook_8601: "Delete this notebook"
  save_be5f: "Save"
ja:
  removeLocalFolder_505d: "ローカルフォルダを削除"
  permanentlyDeleteNotebook_f65f: "ノートブックを完全に削除"
  editNotebook_ed4e: "ノートブックを編集"
  thisOnlyRemovesTheFolderFrom_f45b: "アプリから削除されるだけで、ディスク上のファイルは削除されません"
  thisActionCannotBeUndone_a002: "この操作は元に戻せません。慎重に操作してください"
  changeTheNotebookNameIconAnd_0816: "ノートブックの名前、アイコン、検索設定を変更します"
  remove_e2cf: "削除する"
  delete_631c: "削除する"
  cancel_625f: "キャンセル"
  notebookName_1be5: "ノートブック名"
  enterANotebookName_9843: "ノートブック名を入力"
  excludeFromGlobalSearch_0025: "全体検索に表示しない"
  excludeThisNotebookWhenSearchingAll_add2: "オンにすると、他のノートブックから「すべてのノートブック」を検索する際にこのノートブックが除外されます。このノートブック内の検索には影響しません。"
  removeThisNotebook_54d3: "このノートブックを削除"
  deleteThisNotebook_8601: "このノートブックを削除"
  save_be5f: "保存"
`;
const uiText = createTranslator(localMessages);
import * as GooseIcons from "@/components/ui/icons";
import { AlertTriangle, Save } from "@/components/ui/icons";
import { Switch, SwitchRow } from "@/components/ui/switch";
import { NotebookIconSelector } from "./NotebookIconSelector";

interface NotebookEditDialogProps {
  open: boolean;
  notebookId: string;
  name: string;
  icon: string;
  confirmName: string;
  excludeFromGlobalSearch?: boolean;
  openDeleteConfirm?: boolean;
  isLocalFolder?: boolean;
  onOpenChange: (open: boolean) => void;
  onNameChange: (name: string) => void;
  onIconChange: (icon: string) => void;
  onExcludeFromGlobalSearchChange: (value: boolean) => void;
  onSave: () => void;
  onDelete: () => void;
}

export function NotebookEditDialog({
  open,
  notebookId,
  name,
  icon,
  confirmName,
  excludeFromGlobalSearch = false,
  openDeleteConfirm = false,
  isLocalFolder = false,
  onOpenChange,
  onNameChange,
  onIconChange,
  onExcludeFromGlobalSearchChange,
  onSave,
  onDelete,
}: NotebookEditDialogProps) {
  useLocale();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [iconContainer, setIconContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      setShowDeleteConfirm(false);
      setDeleteConfirmInput("");
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setShowDeleteConfirm(openDeleteConfirm);
    }
  }, [open, openDeleteConfirm]);

  const isDeleteEnabled = deleteConfirmInput === confirmName;

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      layout="fullscreen"
      contentClassName="bg-[hsl(var(--goose-shell-bg))]"
      bodyClassName="relative h-full overflow-y-auto p-6 animate-in fade-in duration-200"
    >
      { }
      <div ref={setIconContainer} className="relative mx-auto w-full max-w-md py-6">
        { }
        <div className="text-center mb-8">
          {showDeleteConfirm && (
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-[14px] mb-4 bg-[var(--goose-color-danger-subtle-bg)]">
              <AlertTriangle className="w-7 h-7 text-danger" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {showDeleteConfirm
              ? (isLocalFolder ? uiText("removeLocalFolder_505d") : uiText("permanentlyDeleteNotebook_f65f"))
              : uiText("editNotebook_ed4e")}
          </h1>
          <p className="text-muted-foreground">
            {showDeleteConfirm
              ? (isLocalFolder ? uiText("thisOnlyRemovesTheFolderFrom_f45b") : uiText("thisActionCannotBeUndone_a002"))
              : uiText("changeTheNotebookNameIconAnd_0816")}
          </p>
        </div>

        { }
        {showDeleteConfirm ? (
          <div className="bg-[var(--goose-color-danger-subtle-bg)] backdrop-blur-[1px] rounded-[14px] p-6 shadow-[0_12px_26px_rgba(15,23,42,0.1)] space-y-4">
            <div className="space-y-3">
              <Label
                htmlFor="confirm-delete"
                className="select-text text-sm font-medium text-danger"
              >
                {isLocalFolder ? uiText("remove_e2cf") : uiText("delete_631c")} <span className="select-text font-bold">{confirmName}</span>
              </Label>
              <Input
                id="confirm-delete"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder={confirmName}
                className="h-12 text-base"
                autoFocus
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  if (openDeleteConfirm) {
                    onOpenChange(false);
                  } else {
                    setShowDeleteConfirm(false);
                  }
                }}
                className="flex-1"
              >
                {uiText("cancel_625f")}</Button>
              <Button
                variant="destructive"
                size="lg"
                onClick={() => {
                  if (!isDeleteEnabled) return;
                  onDelete();
                }}
                disabled={!isDeleteEnabled}
                className="flex-1"
              >
                {isLocalFolder ? uiText("remove_e2cf") : uiText("delete_631c")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-card backdrop-blur-[1px] border-0 rounded-[14px] p-6 shadow-[0_12px_26px_rgba(15,23,42,0.1)] space-y-4">
            <div className="flex justify-center">
              <NotebookIconSelector
                value={icon}
                defaultIcon={isLocalFolder ? "FolderOpen" : "BookOpen"}
                onChange={onIconChange}
                container={iconContainer}
              />
            </div>
            <div className="flex flex-col items-center gap-3">
              <Input
                id="notebook-name"
                aria-label={uiText("notebookName_1be5")}
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder={uiText("enterANotebookName_9843")}
                className="h-12 text-center text-base"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSave();
                  }
                }}
              />
            </div>

            <SwitchRow className="flex flex-col items-center gap-3 rounded-[var(--goose-control-radius)] border border-border/60 bg-muted/20 px-4 py-3 text-center">
              <span className="block min-w-0 space-y-1">
                <span
                  className="text-sm font-medium leading-none text-foreground"
                >
                  {uiText("excludeFromGlobalSearch_0025")}</span>
                <span className="block text-xs text-muted-foreground leading-relaxed">
                  {uiText("excludeThisNotebookWhenSearchingAll_add2")}</span>
              </span>
              <Switch
                id="exclude-from-global-search"
                checked={excludeFromGlobalSearch}
                onCheckedChange={onExcludeFromGlobalSearchChange}
                className="shrink-0"
              />
            </SwitchRow>
          </div>
        )}

        { }
        {!showDeleteConfirm && (
          <div className="flex flex-col gap-4 mt-6">
            { }
            {notebookId && (
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-muted-foreground hover:text-[var(--goose-color-danger-focus)] hover:bg-[var(--goose-color-danger-subtle-bg)] w-full"
                >
                  {isLocalFolder ? (
                    <GooseIcons.FolderX className="mr-2 h-4 w-4" />
                  ) : (
                    <GooseIcons.Trash2 className="mr-2 h-4 w-4" />
                  )}
                  {isLocalFolder ? uiText("removeThisNotebook_54d3") : uiText("deleteThisNotebook_8601")}
                </Button>
              )}

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={() => onOpenChange(false)}
                className="h-11 w-full"
              >
                {uiText("cancel_625f")}</Button>
              <Button
                size="lg"
                onClick={onSave}
                disabled={!notebookId}
                className="h-11 w-full"
              >
                <Save className="mr-2 h-4 w-4" />
                {uiText("save_be5f")}</Button>
            </div>
          </div>
        )}
      </div>
    </DialogShell>
  );
}
