/** Shared by settings and the desktop synchronizer; IDs never enter folder names. */
export function gitNotebookDirectory(localPath: string): string {
  const name = localPath.replace(/\\/g, "/").replace(/\/+$/, "").split("/").pop() ?? "";
  if (!isGitNotebookDirectory(name)) throw new Error("文件夹名称不符合跨平台同步规则，请先重命名本地文件夹");
  return name;
}

export function isGitNotebookDirectory(name: string): boolean {
  return Boolean(name && name.length <= 200 && name !== "." && name !== ".."
    && !name.startsWith(".") && !/[\\/:*?"<>|\0\r\n]/.test(name) && !/[. ]$/.test(name)
    && !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name));
}
