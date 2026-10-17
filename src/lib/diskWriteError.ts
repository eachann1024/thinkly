import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/diskWriteError.ts#localMessages:1">`
zh-Hans:
  cloudPermission: "笔记文件夹当前无法写入（权限不足）。若笔记在 iCloud 等云盘上，请先恢复云盘登录后再保存。"
  youDonTHaveWriteAccessToTheNotes: "笔记文件夹当前无法写入（权限不足）。请检查系统文件夹权限后再保存。"
  theNotesFolderIsReadOnlyChangesCouldnT: "笔记文件夹处于只读状态，无法保存更改。"
  thereIsnTEnoughDiskSpaceToSaveYour: "磁盘可用空间不足，无法保存更改，请清理空间后重试。"
  theSaveLocationNoLongerExistsItsFolderMay: "保存路径不存在，所属文件夹可能已被移动或重命名。"
  theFileSystemIsBusyTrySavingAgainIn: "文件系统正忙，请稍后重试保存。"
  aDiskErrorOccurredCheckYourDriveOrCloud: "磁盘读写出错，请检查驱动器或云盘状态后重试。"
  couldnTSaveTheNoteToDiskCheckThat: "笔记未能写入磁盘，请检查文件夹是否具备写入权限。"
  couldnTSaveTheNoteToDiskTryAgain: "笔记未能写入磁盘，请重试。"
en:
  cloudPermission: "You don’t have write access to the notes folder. If your notes are on iCloud or another cloud drive, sign back in before saving."
  youDonTHaveWriteAccessToTheNotes: "You don’t have write access to the notes folder. Check the folder’s permissions before saving."
  theNotesFolderIsReadOnlyChangesCouldnT: "The notes folder is read-only. Changes couldn’t be saved."
  thereIsnTEnoughDiskSpaceToSaveYour: "There isn’t enough disk space to save your changes. Free up some space and try again."
  theSaveLocationNoLongerExistsItsFolderMay: "The save location no longer exists. Its folder may have been moved or renamed."
  theFileSystemIsBusyTrySavingAgainIn: "The file system is busy. Try saving again in a moment."
  aDiskErrorOccurredCheckYourDriveOrCloud: "A disk error occurred. Check your drive or cloud storage and try again."
  couldnTSaveTheNoteToDiskCheckThat: "Couldn’t save the note to disk. Check that you have write access to the folder."
  couldnTSaveTheNoteToDiskTryAgain: "Couldn’t save the note to disk. Try again."
ja:
  cloudPermission: "ノートフォルダに書き込めません（権限がありません）。ノートが iCloud などのクラウドドライブにある場合は、先にクラウドドライブにサインインし直してから保存してください。"
  youDonTHaveWriteAccessToTheNotes: "ノートフォルダに書き込めません（権限がありません）。システムのフォルダ権限を確認してから保存してください。"
  theNotesFolderIsReadOnlyChangesCouldnT: "ノートフォルダは読み取り専用のため、変更を保存できません。"
  thereIsnTEnoughDiskSpaceToSaveYour: "ディスクの空き容量が不足しているため、変更を保存できません。空き容量を確保してからやり直してください。"
  theSaveLocationNoLongerExistsItsFolderMay: "保存先が存在しません。フォルダが移動または名前変更された可能性があります。"
  theFileSystemIsBusyTrySavingAgainIn: "ファイルシステムがビジー状態です。しばらくしてからもう一度保存してください。"
  aDiskErrorOccurredCheckYourDriveOrCloud: "ディスクエラーが発生しました。ドライブまたはクラウドストレージの状態を確認してから、もう一度お試しください。"
  couldnTSaveTheNoteToDiskCheckThat: "ノートをディスクに保存できませんでした。フォルダへの書き込み権限があるか確認してください。"
  couldnTSaveTheNoteToDiskTryAgain: "ノートをディスクに保存できませんでした。もう一度お試しください。"
`;
const uiText = createTranslator(localMessages);
/** 磁盘写入失败。把 EACCES 等底层错误收成可展示的中文说明。 */

export class DiskWriteError extends Error {
  readonly code?: string;
  readonly path?: string;

  constructor(
    message: string,
    options?: { code?: string; path?: string; cause?: unknown },
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "DiskWriteError";
    this.code = options?.code;
    this.path = options?.path;
  }
}

let lastWriteFailure: DiskWriteError | null = null;

export function rememberDiskWriteFailure(error: DiskWriteError): void {
  lastWriteFailure = error;
}

export function consumeDiskWriteFailure(): DiskWriteError | null {
  const error = lastWriteFailure;
  lastWriteFailure = null;
  return error;
}

function toText(error: unknown): string {
  if (error instanceof Error) return error.message.trim();
  if (typeof error === "string") return error.trim();
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message.trim() : "";
  }
  return "";
}

function extractCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && code.trim()) return code.trim().toUpperCase();
  }
  const text = toText(error);
  const match = text.match(/\b(EACCES|EPERM|EROFS|ENOSPC|ENOENT|EBUSY|EIO|EAGAIN)\b/i);
  return match?.[1]?.toUpperCase() ?? "";
}

function mentionsCloud(text: string): boolean {
  return /icloud|fuse\.driver|onedrive|dropbox|google.?drive|megasync/i.test(
    text,
  );
}

export function toDiskWriteError(
  error: unknown,
  path?: string,
): DiskWriteError {
  if (error instanceof DiskWriteError) return error;
  const code = extractCode(error);
  return new DiskWriteError(describeDiskWriteError(error, path), {
    code: code || undefined,
    path,
    cause: error,
  });
}

export function describeDiskWriteError(error: unknown, path?: string): string {
  if (error instanceof DiskWriteError && error.message) return error.message;

  const text = toText(error);
  const code = extractCode(error);
  const haystack = `${text} ${path ?? ""}`;
  const cloud = mentionsCloud(haystack);

  if (code === "EACCES" || code === "EPERM" || /permission denied/i.test(text)) {
    return cloud
      ? uiText("cloudPermission")
      : uiText("youDonTHaveWriteAccessToTheNotes");
  }
  if (code === "EROFS" || /read-only file system/i.test(text)) {
    return uiText("theNotesFolderIsReadOnlyChangesCouldnT");
  }
  if (code === "ENOSPC") {
    return uiText("thereIsnTEnoughDiskSpaceToSaveYour");
  }
  if (code === "ENOENT") {
    return uiText("theSaveLocationNoLongerExistsItsFolderMay");
  }
  if (code === "EBUSY" || code === "EAGAIN") {
    return uiText("theFileSystemIsBusyTrySavingAgainIn");
  }
  if (code === "EIO") {
    return uiText("aDiskErrorOccurredCheckYourDriveOrCloud");
  }
  if (text.includes("本地页面保存未完成") || text.includes("manual save failed")) {
    return uiText("couldnTSaveTheNoteToDiskCheckThat");
  }
  if (text) return text;
  return uiText("couldnTSaveTheNoteToDiskTryAgain");
}
