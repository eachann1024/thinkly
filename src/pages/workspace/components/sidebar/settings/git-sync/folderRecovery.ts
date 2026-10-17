import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/git-sync/folderRecovery.ts#localMessages:1">`
zh-Hans:
  couldNotOpenTheFolderPicker_3fce: "无法打开文件夹选择器，请重新启动桌面应用"
  couldNotReadFolder_b081: "文件夹读取失败"
en:
  couldNotOpenTheFolderPicker_3fce: "Could not open the folder picker. Restart the desktop app."
  couldNotReadFolder_b081: "Could not read folder"
ja:
  couldNotOpenTheFolderPicker_3fce: "フォルダ選択ダイアログを開けませんでした。デスクトップアプリを再起動してください"
  couldNotReadFolder_b081: "フォルダを読み込めませんでした"
`;
const uiText = createTranslator(localMessages);
import { getGooseDesktop } from "@/lib/electron/runtime";
import { useNotebooks } from "@/stores/useNotebooks";
import { usePages } from "@/stores/usePages";
import type { GitRepositoryFolder, GitSyncBridge } from "@/lib/git-sync-contract";

export async function selectRecoveryPath(folder: GitRepositoryFolder, relocate: boolean) {
  const desktop = getGooseDesktop();
  if (!desktop) throw new Error(uiText("couldNotOpenTheFolderPicker_3fce"));
  return relocate
    ? desktop.selectDirectory({ purpose: "recovery", defaultPath: folder.localPath })
    : folder.localPath;
}

export async function rebindOpenedFolder(
  bridge: GitSyncBridge,
  repositoryId: string,
  folder: GitRepositoryFolder,
  localPath: string,
  relocate: boolean,
  mapped: boolean,
) {
  const check = await bridge.checkFolder(localPath);
  if (check.error) throw new Error(check.error);
  const name = relocate ? localPath.split(/[\\/]/).filter(Boolean).at(-1) || folder.name : folder.name;
  const notebookId = useNotebooks.getState().createLocalFolderNotebook(name, localPath);
  await usePages.getState().loadLocalFolderPages(notebookId, localPath);
  const loaded = useNotebooks.getState().localFolderLoadStates[notebookId];
  if (loaded?.status === "error") throw new Error(loaded.error || uiText("couldNotReadFolder_b081"));
  if (!mapped) return bridge.getState();
  return bridge.rebindFolder({
    repositoryId,
    notebookId: folder.notebookId,
    folder: { ...folder, notebookId, localPath, name },
  });
}
