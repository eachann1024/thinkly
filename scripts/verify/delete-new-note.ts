import "./lib/node-dom";
import { readFileSync } from "node:fs";
import { access, mkdtemp, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setLanguageSnapshot } from "@/i18n/runtime";
import {
  DELETE_FAILURE_KINDS,
  classifyDeleteFailure,
  consumeDeleteFailureMessage,
  describeDeleteFailure,
  isMissingFileError,
  type DeleteFailureKind,
} from "@/lib/delete-failure";
import { setLocalMdSnapshot } from "@/lib/local-md-snapshot";
import { createChecker } from "./lib/check";

const checker = createChecker();
const { check } = checker;
const errno = (code: string, message = code) => Object.assign(new Error(message), { code });

const SAMPLES: Record<DeleteFailureKind, unknown> = {
  permission: errno("EACCES", "EACCES: permission denied, copyfile '/vault/新页面 (1).md'"),
  readOnly: errno("EROFS", "EROFS: read-only file system, open '/vault/新页面 (1).md'"),
  noSpace: errno("ENOSPC", "ENOSPC: no space left on device, write"),
  busy: errno("EBUSY", "EBUSY: resource busy or locked"),
  disk: errno("EIO", "EIO: i/o error"),
  nameTooLong: errno("ENAMETOOLONG", "ENAMETOOLONG: name too long"),
  pathMismatch: errno("ENOTDIR", "ENOTDIR: not a directory"),
  outsideNotebook: new Error("路径不在允许的仓库或应用数据目录内"),
  syncLocked: new Error("此笔记本正在同步，请稍后重试文件操作"),
  trashUnsupported: new Error("Trashing on system internal mounts is not supported"),
  desktopUnavailable: new Error("desktop-unavailable"),
  unknown: new Error("Failed to move item to trash\n    at trashUndo (electron/main/trashUndo.ts:40:11)"),
};

const COPY: Record<"zh-Hans" | "en" | "ja", Record<DeleteFailureKind, string>> = {
  "zh-Hans": {
    permission: "没有权限把这份笔记移入废纸篓，请检查文件夹权限后再试。",
    readOnly: "笔记所在位置是只读的，无法移入废纸篓。",
    noSpace: "磁盘空间不足，删除没有完成。请清理空间后重试。",
    busy: "这份笔记的文件正被占用，请稍后再删除。",
    disk: "读写磁盘时出错，删除没有完成。请检查磁盘或云盘后再试。",
    nameTooLong: "文件名或路径过长，无法移入废纸篓。",
    pathMismatch: "笔记路径和磁盘上的类型不一致，无法删除。",
    outsideNotebook: "这份笔记的路径不在允许的文件夹内，无法删除。",
    syncLocked: "笔记本正在同步，请稍后再删除。",
    trashUnsupported: "当前位置不支持系统废纸篓，无法删除这份笔记。",
    desktopUnavailable: "当前环境无法访问本机文件，删除没有完成。",
    unknown: "没能把这份笔记移入废纸篓，请稍后重试。",
  },
  en: {
    permission: "You don’t have permission to move this note to the Trash. Check the folder’s permissions and try again.",
    readOnly: "This note is in a read-only location and can’t be moved to the Trash.",
    noSpace: "There isn’t enough disk space to finish deleting. Free up some space and try again.",
    busy: "This note’s file is in use. Try deleting it again in a moment.",
    disk: "A disk error interrupted the deletion. Check the drive or cloud storage and try again.",
    nameTooLong: "The file name or path is too long to move to the Trash.",
    pathMismatch: "The note’s path doesn’t match what’s on disk, so it couldn’t be deleted.",
    outsideNotebook: "This note is outside the allowed folders and can’t be deleted.",
    syncLocked: "This notebook is syncing. Try deleting again shortly.",
    trashUnsupported: "This location doesn’t support the system Trash, so the note couldn’t be deleted.",
    desktopUnavailable: "Local files aren’t available in this environment, so the deletion didn’t finish.",
    unknown: "Couldn’t move this note to the Trash. Try again in a moment.",
  },
  ja: {
    permission: "このノートをゴミ箱に移動する権限がありません。フォルダの権限を確認してから、もう一度お試しください。",
    readOnly: "ノートのある場所は読み取り専用のため、ゴミ箱に移動できません。",
    noSpace: "ディスクの空き容量が不足しているため、削除を完了できません。空き容量を確保してからもう一度お試しください。",
    busy: "このノートのファイルは使用中です。しばらくしてからもう一度削除してください。",
    disk: "ディスクの読み書きでエラーが発生したため、削除を完了できません。ドライブまたはクラウドストレージを確認してから、もう一度お試しください。",
    nameTooLong: "ファイル名またはパスが長すぎるため、ゴミ箱に移動できません。",
    pathMismatch: "ノートのパスとディスク上の種類が一致しないため、削除できません。",
    outsideNotebook: "このノートのパスは許可されたフォルダの外にあるため、削除できません。",
    syncLocked: "ノートブックを同期中です。しばらくしてからもう一度削除してください。",
    trashUnsupported: "現在の場所はシステムのゴミ箱に対応していないため、このノートを削除できません。",
    desktopUnavailable: "この環境ではローカルファイルを操作できないため、削除を完了できません。",
    unknown: "このノートをゴミ箱に移動できませんでした。しばらくしてからもう一度お試しください。",
  },
};

const RAW = /EACCES|EPERM|EROFS|ENOSPC|EBUSY|EAGAIN|ETXTBSY|EIO|ENOENT|ENAMETOOLONG|EISDIR|ENOTDIR|Failed to move|desktop-unavailable|trash-failed|trashUndo\.ts|项未完成|件は未完了/;

function useLocale(locale: "zh-Hans" | "en" | "ja", revision: number) {
  setLanguageSnapshot({
    preference: locale,
    effectiveLocale: locale,
    formatLocale: locale === "zh-Hans" ? "zh-CN" : locale === "ja" ? "ja-JP" : "en-US",
    revision,
  });
}

/** 已知删除失败都有中英日人话，且不会把异常原文交给用户。 */
export function checkDeleteFailureCopy(): number {
  let revision = 1;
  for (const locale of ["zh-Hans", "en", "ja"] as const) {
    useLocale(locale, revision++);
    for (const kind of DELETE_FAILURE_KINDS) {
      const message = describeDeleteFailure(SAMPLES[kind]);
      const expected = COPY[locale][kind];
      check(
        `${locale} ${kind} 是给人看的说明`,
        classifyDeleteFailure(SAMPLES[kind]) === kind && message === expected && message.length > 0 && !RAW.test(message),
        message,
      );
    }
  }
  const aliases: Array<[unknown, DeleteFailureKind]> = [
    [new Error("This notebook is syncing. Try the file operation again shortly."), "syncLocked"],
    [new Error("このノートブックは同期中です。しばらくしてからファイル操作をやり直してください"), "syncLocked"],
    [new Error("The path is outside the allowed repositories and app data directory."), "outsideNotebook"],
    [new Error("パスが許可されたリポジトリまたはアプリデータのディレクトリ内にありません"), "outsideNotebook"],
    [new Error("Paths can’t contain .."), "outsideNotebook"],
    [new Error("パスに .. を含めることはできません"), "outsideNotebook"],
    [new Error("Failed to create FileOperation"), "trashUnsupported"],
    [errno("EPERM", "EPERM: operation not permitted"), "permission"],
    [new Error("The process cannot access the file because it is being used by another process"), "busy"],
  ];
  check("同步、路径和废纸篓的三语原文都归到对应种类", aliases.every(([error, kind]) => classifyDeleteFailure(error) === kind));
  const missing = [
    errno("ENOENT", "ENOENT: no such file or directory"),
    new Error("文件或文件夹不存在"),
    new Error("The file or folder does not exist."),
    new Error("ファイルまたはフォルダが存在しません"),
  ];
  check("文件已经不在时不当作未翻译的删除失败", missing.every((error) => isMissingFileError(error)));
  useLocale("zh-Hans", revision);
  const leaked = describeDeleteFailure(SAMPLES.unknown);
  check("堆栈和废纸篓原文不会出现在提示里", leaked === COPY["zh-Hans"].unknown && !leaked.includes("trashUndo"));
  const receipt = readFileSync("src/components/ui/delete-receipt.tsx", "utf8");
  const layout = readFileSync("src/styles/toast/layout.css", "utf8");
  check(
    "整句失败原因换行展示，不再只剩未完成",
    receipt.includes("goose-delete-failure-toast") && layout.includes(".goose-delete-failure-toast [data-title]") && layout.includes("white-space: normal"),
  );
  return checker.failed;
}

async function exists(filePath: string) {
  try { await access(filePath); return true; } catch { return false; }
}

function installFs(root: string) {
  let holdWrite = true;
  let releaseWrite: () => void = () => {};
  const gate = new Promise<void>((resolve) => { releaseWrite = resolve; });
  const api = {
    readDir: () => [],
    readFile: () => null,
    writeFile: () => false,
    exists: () => false,
    watch: () => ({}),
    unwatch() {},
    async existsAsync(filePath: string) { return exists(filePath); },
    async readFileAsync(filePath: string) { return readFile(filePath, "utf8"); },
    async writeFileAsync(filePath: string, content: string) {
      if (holdWrite) { holdWrite = false; await gate; }
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, content);
      return true;
    },
    async statAsync(filePath: string) {
      const info = await stat(filePath);
      return { mtimeMs: info.mtimeMs, size: info.size };
    },
    async mkdir(dir: string) { await mkdir(dir, { recursive: true }); return true; },
    async trashWithUndo(filePath: string) {
      const dest = path.join(root, ".trash", path.basename(filePath));
      await mkdir(path.dirname(dest), { recursive: true });
      await rename(filePath, dest);
      return `token-${path.basename(filePath)}`;
    },
    async deleteFile(filePath: string) { await rm(filePath, { force: true }); return true; },
    async rename() { return true; },
  };
  window.gooseFs = api as unknown as NonNullable<Window["gooseFs"]>;
  return { releaseWrite: () => releaseWrite(), stopHolding() { holdWrite = false; } };
}

async function waitForPage(titlePart: string) {
  const start = Date.now();
  while (Date.now() - start < 8000) {
    const page = Object.values((await import("@/stores/usePages")).usePages.getState().pages)
      .find((item) => item.localFilePath?.includes(titlePart));
    if (page) return page;
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
  return null;
}

/** 新建尚未写完的空笔记可以马上删除，真实失败则展示人话而不是「N 项未完成」。 */
export async function checkDeleteNewNote(): Promise<number> {
  const { usePages } = await import("@/stores/usePages");
  const { useNotebooks } = await import("@/stores/useNotebooks");
  const { useSettings } = await import("@/stores/useSettings");
  const { toast } = await import("@/components/ui/sonner");
  const { deletePageWithUndo } = await import("@/lib/page-delete-actions");
  const root = await mkdtemp(path.join(tmpdir(), "goose-delete-note-"));
  const fs = installFs(root);
  useNotebooks.setState({
    notebooks: { nb: { id: "nb", name: "Note", source: "local-folder", localPath: root, createdAt: 1, updatedAt: 1 } },
    activeNotebookId: "nb",
  });
  useSettings.setState({ randomIconOnCreate: false });
  await writeFile(path.join(root, "新页面.md"), "");
  useLocale("zh-Hans", 20);

  const creating = usePages.getState().createLocalPage(undefined, "nb");
  const fresh = await waitForPage("新页面 (1)");
  const deleting = fresh ? usePages.getState().deletePage(fresh.id) : Promise.resolve(false);
  await new Promise((resolve) => setTimeout(resolve, 30));
  fs.releaseWrite();
  const createdId = await creating.catch((error: unknown) => error);
  const deleted = await deleting;
  const freshPath = fresh?.localFilePath;
  check(
    "刚新建的空笔记在写盘期间删除成功，且没有未翻译错误",
    Boolean(fresh) && deleted === true && !(createdId instanceof Error) &&
      (createdId == null || createdId === fresh!.id) && !usePages.getState().pages[fresh!.id] &&
      freshPath != null && !(await exists(freshPath)) && consumeDeleteFailureMessage() == null,
    { createdId, deleted, remains: Boolean(fresh && usePages.getState().pages[fresh.id]), freshPath },
  );

  fs.stopHolding();
  const content = [{ id: "b1", type: "paragraph", props: {}, children: [], content: [{ type: "text", text: "hello", styles: {} }] }];
  const contentId = await usePages.getState().createLocalPageRecord({ workspaceId: "nb", title: "有内容", content: content as never });
  const contentPath = contentId ? usePages.getState().pages[contentId]?.localFilePath : undefined;
  const contentText = contentPath ? await readFile(contentPath, "utf8").catch(() => "") : "";
  const contentDeleted = contentId ? await usePages.getState().deletePage(contentId) : false;
  check(
    "已有内容的笔记仍能删除",
    Boolean(contentId) && contentText.includes("hello") && contentDeleted && !usePages.getState().pages[contentId!] &&
      contentPath != null && !(await exists(contentPath)),
    contentText.slice(0, 120),
  );

  const missingId = await usePages.getState().createLocalPageRecord({ workspaceId: "nb", title: "缺文件", content: content as never });
  const missingPath = missingId ? usePages.getState().pages[missingId]?.localFilePath : undefined;
  if (missingPath) await rm(missingPath, { force: true });
  const missingDeleted = missingId ? await usePages.getState().deletePage(missingId) : false;
  check(
    "磁盘文件已经不在时清掉记录，不报未完成",
    Boolean(missingId) && missingDeleted && !usePages.getState().pages[missingId!] && consumeDeleteFailureMessage() == null,
  );

  const snapId = await usePages.getState().createLocalPageRecord({ workspaceId: "nb", title: "快照残留" });
  const snapPage = snapId ? usePages.getState().pages[snapId] : undefined;
  const snapPath = snapPage?.localFilePath;
  const snapText = snapPath ? await readFile(snapPath, "utf8") : "";
  if (snapPath) {
    await rm(snapPath, { force: true });
    setLocalMdSnapshot(snapPath, snapText);
  }
  const rewritten = snapId && snapPage ? await usePages.getState().saveLocalPageContent(snapId, snapPage.content, { force: true }) : false;
  const restored = snapPath ? await readFile(snapPath, "utf8").catch(() => "") : "";
  check("快照还在但文件已删时会重新写盘", Boolean(snapId) && rewritten === true && restored === snapText, restored.slice(0, 80));

  const blockedId = await usePages.getState().createLocalPageRecord({ workspaceId: "nb", title: "无权限" });
  const blocked = blockedId ? usePages.getState().pages[blockedId] : undefined;
  const seen: string[] = [];
  toast.error = ((message: unknown) => { seen.push(String(message)); return 1; }) as typeof toast.error;
  window.gooseFs!.trashWithUndo = async () => {
    throw Object.assign(new Error("EACCES: permission denied, copyfile '/vault/无权限.md'"), { code: "EACCES" });
  };
  if (blockedId) await deletePageWithUndo(blockedId);
  check(
    "删除失败展示权限说明，而不是「1 项未完成」或异常原文",
    Boolean(blockedId) && usePages.getState().pages[blockedId!] && blocked?.localFilePath != null &&
      await exists(blocked!.localFilePath!) && seen.length === 1 && seen[0] === COPY["zh-Hans"].permission &&
      !seen[0].includes("未完成") && !seen[0].includes("EACCES") && !seen[0].includes("/vault"),
    seen,
  );

  await rm(root, { recursive: true, force: true });
  return checker.failed;
}

export default async function run(): Promise<number> {
  checkDeleteFailureCopy();
  await checkDeleteNewNote();
  return checker.failed;
}
