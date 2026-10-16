export function normalizeNewFileName(value: string): string {
  const name = value.trim().replace(/\.(md|markdown)$/i, "").trim();
  if (!name || name === "." || name === "..") throw new Error("请输入文件名称");
  if (/[\\/:*?"<>|]/.test(name) || Array.from(name).some((char) => char.charCodeAt(0) < 32) || /[. ]$/.test(name)) {
    throw new Error("文件名称包含不支持的字符");
  }
  return name;
}
