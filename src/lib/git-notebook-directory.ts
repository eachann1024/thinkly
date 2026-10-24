import { gitText } from "./git-messages";
export function gitNotebookDirectory(localPath: string): string {
  const name = localPath.replace(/\\/g, "/").replace(/\/+$/, "").split("/").pop() ?? "";
  if (!isGitNotebookDirectory(name)) throw new Error(gitText("crossPlatformName"));
  return name;
}

export function isGitNotebookDirectory(name: string): boolean {
  return Boolean(name && name.length <= 200 && name !== "." && name !== ".."
    && !name.startsWith(".") && !/[\\/:*?"<>|\0\r\n]/.test(name) && !/[. ]$/.test(name)
    && !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name));
}
