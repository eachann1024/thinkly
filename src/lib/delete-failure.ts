import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/delete-failure.ts#localMessages:1">`
zh-Hans:
  permission: "没有权限把这份笔记移入废纸篓，请检查文件夹权限后再试。"
  readOnly: "笔记所在位置是只读的，无法移入废纸篓。"
  noSpace: "磁盘空间不足，删除没有完成。请清理空间后重试。"
  busy: "这份笔记的文件正被占用，请稍后再删除。"
  disk: "读写磁盘时出错，删除没有完成。请检查磁盘或云盘后再试。"
  nameTooLong: "文件名或路径过长，无法移入废纸篓。"
  pathMismatch: "笔记路径和磁盘上的类型不一致，无法删除。"
  outsideNotebook: "这份笔记的路径不在允许的文件夹内，无法删除。"
  syncLocked: "笔记本正在同步，请稍后再删除。"
  trashUnsupported: "当前位置不支持系统废纸篓，无法删除这份笔记。"
  desktopUnavailable: "当前环境无法访问本机文件，删除没有完成。"
  unknown: "没能把这份笔记移入废纸篓，请稍后重试。"
en:
  permission: "You don’t have permission to move this note to the Trash. Check the folder’s permissions and try again."
  readOnly: "This note is in a read-only location and can’t be moved to the Trash."
  noSpace: "There isn’t enough disk space to finish deleting. Free up some space and try again."
  busy: "This note’s file is in use. Try deleting it again in a moment."
  disk: "A disk error interrupted the deletion. Check the drive or cloud storage and try again."
  nameTooLong: "The file name or path is too long to move to the Trash."
  pathMismatch: "The note’s path doesn’t match what’s on disk, so it couldn’t be deleted."
  outsideNotebook: "This note is outside the allowed folders and can’t be deleted."
  syncLocked: "This notebook is syncing. Try deleting again shortly."
  trashUnsupported: "This location doesn’t support the system Trash, so the note couldn’t be deleted."
  desktopUnavailable: "Local files aren’t available in this environment, so the deletion didn’t finish."
  unknown: "Couldn’t move this note to the Trash. Try again in a moment."
ja:
  permission: "このノートをゴミ箱に移動する権限がありません。フォルダの権限を確認してから、もう一度お試しください。"
  readOnly: "ノートのある場所は読み取り専用のため、ゴミ箱に移動できません。"
  noSpace: "ディスクの空き容量が不足しているため、削除を完了できません。空き容量を確保してからもう一度お試しください。"
  busy: "このノートのファイルは使用中です。しばらくしてからもう一度削除してください。"
  disk: "ディスクの読み書きでエラーが発生したため、削除を完了できません。ドライブまたはクラウドストレージを確認してから、もう一度お試しください。"
  nameTooLong: "ファイル名またはパスが長すぎるため、ゴミ箱に移動できません。"
  pathMismatch: "ノートのパスとディスク上の種類が一致しないため、削除できません。"
  outsideNotebook: "このノートのパスは許可されたフォルダの外にあるため、削除できません。"
  syncLocked: "ノートブックを同期中です。しばらくしてからもう一度削除してください。"
  trashUnsupported: "現在の場所はシステムのゴミ箱に対応していないため、このノートを削除できません。"
  desktopUnavailable: "この環境ではローカルファイルを操作できないため、削除を完了できません。"
  unknown: "このノートをゴミ箱に移動できませんでした。しばらくしてからもう一度お試しください。"
`;
const uiText = createTranslator(localMessages);

export const DELETE_FAILURE_KINDS = [
  "permission",
  "readOnly",
  "noSpace",
  "busy",
  "disk",
  "nameTooLong",
  "pathMismatch",
  "outsideNotebook",
  "syncLocked",
  "trashUnsupported",
  "desktopUnavailable",
  "unknown",
] as const;

export type DeleteFailureKind = (typeof DELETE_FAILURE_KINDS)[number];

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message.trim();
  if (typeof error === "string") return error.trim();
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message.trim() : "";
  }
  return "";
}

function errorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && code.trim()) return code.trim().toUpperCase();
  }
  const match = errorText(error).match(
    /\b(EACCES|EPERM|EROFS|ENOSPC|EBUSY|EAGAIN|ETXTBSY|EIO|ENOENT|ENAMETOOLONG|EISDIR|ENOTDIR)\b/i,
  );
  return match?.[1]?.toUpperCase() ?? "";
}

/** 文件已经不在磁盘上。删除这类笔记应直接清掉记录，而不是报失败。 */
export function isMissingFileError(error: unknown): boolean {
  const code = errorCode(error);
  const text = errorText(error);
  if (code === "ENOENT") return true;
  return /no such file|file not found|enoent|文件或文件夹不存在|file or folder does not exist|ファイルまたはフォルダが存在しません/i.test(text);
}

export function classifyDeleteFailure(error: unknown): DeleteFailureKind {
  const code = errorCode(error);
  const text = errorText(error);
  if (code === "EACCES" || code === "EPERM" || /permission denied|operation not permitted|don’t have permission|don't have permission/i.test(text)) {
    return "permission";
  }
  if (code === "EROFS" || /read-only file system|read-only/i.test(text)) return "readOnly";
  if (code === "ENOSPC" || /no space left/i.test(text)) return "noSpace";
  if (code === "EBUSY" || code === "EAGAIN" || code === "ETXTBSY" || /resource busy|file is in use|being used by another/i.test(text)) {
    return "busy";
  }
  if (code === "EIO") return "disk";
  if (code === "ENAMETOOLONG") return "nameTooLong";
  if (code === "EISDIR" || code === "ENOTDIR") return "pathMismatch";
  if (/正在同步|is syncing|同期中/.test(text)) return "syncLocked";
  if (/不在允许|outside the allowed|許可された|路径不允许包含|can’t contain \.\.|can't contain \.\.|パスに \.\. を含めることはできません/.test(text)) {
    return "outsideNotebook";
  }
  if (/trashing on system internal|trash.*not supported|not supported.*trash|failed to create fileoperation|failed to parse path/i.test(text)) {
    return "trashUnsupported";
  }
  if (/desktop-unavailable|gooseDesktop|desktop integration is unavailable|デスクトップ連携を利用できません/i.test(text)) {
    return "desktopUnavailable";
  }
  return "unknown";
}

/** 给用户看的删除失败说明。不回传异常原文或堆栈。 */
export function describeDeleteFailure(error: unknown): string {
  return uiText(classifyDeleteFailure(error));
}

let pendingFailure: unknown = undefined;
let pendingSet = false;

export function clearDeleteFailure(): void {
  pendingFailure = undefined;
  pendingSet = false;
}

export function rememberDeleteFailure(error: unknown): void {
  pendingFailure = error;
  pendingSet = true;
}

export function consumeDeleteFailureMessage(): string | null {
  if (!pendingSet) return null;
  const error = pendingFailure;
  clearDeleteFailure();
  return describeDeleteFailure(error);
}
