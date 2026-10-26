import { createTranslator, i18nYaml } from "@/i18n/core";
import { NoteMetadataError, type NoteMetadataErrorCode } from "./contract";

const text = createTranslator(i18nYaml<"src/lib/note-metadata/messages.ts#block1:1">`
zh-Hans:
  missing: "笔记的隐藏元数据缺失，已保留原有格式并停止覆盖。请恢复笔记本内的 .goose 文件夹。"
  mismatch: "正文已被外部修改，无法安全对应原有样式。已保留原版本，请先处理冲突。"
  unsupported: "此笔记的元数据版本暂不支持，已停止覆盖。请使用支持该版本的应用打开。"
  corrupt: "笔记元数据损坏或格式异常，已保留原文件并停止覆盖。"
  conflict: "笔记元数据已被其他操作修改，已保留当前编辑。请重新读取并处理冲突。"
  identity: "笔记 ID 无效或已改变，已停止覆盖并保留当前编辑。"
  unsafe: "笔记元数据路径不安全，已停止读写。"
  tooLarge: "笔记元数据超出处理上限，已保留原文件并停止覆盖。"
  io: "无法读写笔记元数据，已保留当前编辑。请检查文件权限和磁盘状态。"
  duplicateId: "检测到重复的笔记 ID，已阻止覆盖；请使用应用内复制创建独立副本"
  changedId: "磁盘笔记 ID 已改变，已保留当前编辑"
  changedIdRescan: "磁盘笔记 ID 已改变，已保留当前内容；请重新扫描笔记本以确认身份"
  changedIdConflict: "磁盘笔记 ID 已改变，已保留未保存的编辑；请先处理冲突"
  diskRead: "无法读取磁盘笔记，已保留当前编辑"
en:
  missing: "The note’s hidden metadata is missing. Existing formatting is protected. Restore the notebook’s .goose folder."
  mismatch: "The text changed outside the app and its original formatting cannot be matched safely. The previous version is protected. Resolve the conflict first."
  unsupported: "This metadata version is not supported. The original file is protected. Open it with a compatible app."
  corrupt: "The note metadata is damaged or invalid. The original file is protected."
  conflict: "Another operation changed the note metadata. Your edits are kept. Reload and resolve the conflict."
  identity: "The note ID is invalid or changed. Your edits are kept and overwriting is blocked."
  unsafe: "The note metadata path is unsafe. Reading and writing are blocked."
  tooLarge: "The note metadata exceeds the processing limit. The original file is protected."
  io: "The note metadata cannot be read or written. Your edits are kept. Check file permissions and disk status."
  duplicateId: "Duplicate note IDs detected. Overwriting is blocked. Use Duplicate in the app to create an independent copy."
  changedId: "The note ID on disk changed. Your edits are kept."
  changedIdRescan: "The note ID on disk changed. Your current content is kept. Rescan the notebook to confirm its identity."
  changedIdConflict: "The note ID on disk changed. Your unsaved edits are kept. Resolve the conflict first."
  diskRead: "The note on disk could not be read. Your edits are kept."
ja:
  missing: "ノートの非表示メタデータがありません。元の書式は保護されています。ノートブック内の .goose フォルダーを復元してください。"
  mismatch: "本文が外部で変更され、元の書式と安全に対応できません。以前の版を保護しています。競合を解決してください。"
  unsupported: "このメタデータのバージョンには対応していません。元のファイルを保護しています。対応するアプリで開いてください。"
  corrupt: "ノートのメタデータが破損しているか無効です。元のファイルを保護しています。"
  conflict: "別の操作がメタデータを変更しました。編集中の内容は保持されています。再読み込みして競合を解決してください。"
  identity: "ノート ID が無効または変更されています。編集内容を保持し、上書きを停止しました。"
  unsafe: "メタデータのパスが安全ではないため、読み書きを停止しました。"
  tooLarge: "メタデータが処理上限を超えています。元のファイルを保護しています。"
  io: "メタデータを読み書きできません。編集内容を保持しています。権限とディスクの状態を確認してください。"
  duplicateId: "ノート ID の重複を検出したため、上書きを停止しました。アプリ内の複製機能で別のコピーを作成してください。"
  changedId: "ディスク上のノート ID が変更されました。編集中の内容は保持されています。"
  changedIdRescan: "ディスク上のノート ID が変更されました。現在の内容は保持されています。ノートブックを再スキャンして確認してください。"
  changedIdConflict: "ディスク上のノート ID が変更されました。未保存の編集内容は保持されています。先に競合を解決してください。"
  diskRead: "ディスク上のノートを読み込めません。編集中の内容は保持されています。"
`);

const keys: Record<NoteMetadataErrorCode, "missing" | "mismatch" | "unsupported" | "corrupt" | "conflict" | "identity" | "unsafe" | "tooLarge" | "io"> = {
  missing: "missing", mismatch: "mismatch", unsupported: "unsupported", corrupt: "corrupt",
  conflict: "conflict", identity: "identity", "unsafe-path": "unsafe", "too-large": "tooLarge", "io-error": "io",
};

export function noteMetadataErrorMessage(error: unknown): string {
  return error instanceof NoteMetadataError
    ? text(keys[error.code]) : localizeNoteReadError(error instanceof Error ? error.message : String(error));
}

const legacyReadErrors = {
  "检测到重复的笔记 ID，已阻止覆盖；请使用应用内复制创建独立副本": "duplicateId",
  "磁盘笔记 ID 已改变，已保留当前编辑": "changedId",
  "磁盘笔记 ID 已改变，已保留当前内容；请重新扫描笔记本以确认身份": "changedIdRescan",
  "磁盘笔记 ID 已改变，已保留未保存的编辑；请先处理冲突": "changedIdConflict",
  "无法读取磁盘笔记，已保留当前编辑": "diskRead",
} as const;

export function localizeNoteReadError(message: string): string {
  if (!Object.hasOwn(legacyReadErrors, message)) return message;
  const key = legacyReadErrors[message as keyof typeof legacyReadErrors];
  return text(key);
}
