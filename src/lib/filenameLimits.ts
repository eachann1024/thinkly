/**
 * 导出保存框要用的文件名上限。本机实测：
 * - macOS：`getconf NAME_MAX` 255、`PATH_MAX` 1024。文件系统按 255 个 Unicode 标量计
 *   （256 个汉字会被拒绝），但保存面板按 UTF-8 字节禁用「存储」，中文 120 字约 360 字节就会点不了。
 * - Linux（ext4 / btrfs / XFS / ZFS）：文件名 255 字节，路径通常 4096 字节。
 * - Windows：单段 255 个 UTF-16 码元；未开启长路径时整条路径 MAX_PATH 为 260（含结尾 NUL）。
 * 文件名取 255 字节（含扩展名，并按 NFD 展开后的字节数计算），整条路径再按系统收一刀。
 */

const encoder = new TextEncoder();
const EXTENSION = /(\.[A-Za-z0-9]{1,12})$/;

export const MAX_FILENAME_BYTES = 255;

export function utf8ByteLength(value: string): number {
  return encoder.encode(value).length;
}

/** 保存到 macOS 时系统会把名字规范成 NFD，长度按展开后的字节数算。 */
export function filenameByteLength(value: string): number {
  return Math.max(utf8ByteLength(value), utf8ByteLength(value.normalize("NFD")));
}

export function pathLimit(platform: string): { unit: "bytes" | "chars"; max: number } {
  if (platform === "win32") return { unit: "chars", max: 259 };
  if (platform === "darwin") return { unit: "bytes", max: 1023 };
  return { unit: "bytes", max: 4095 };
}

function trimEdge(value: string): string {
  return value.replace(/^\s+/g, "").replace(/[.\s]+$/g, "");
}

function codePoints(value: string): string[] {
  return Array.from(value);
}

export function truncateToBytes(value: string, maxBytes: number): string {
  if (maxBytes <= 0) return "";
  const kept: string[] = [];
  for (const char of codePoints(value)) {
    if (filenameByteLength(kept.join("") + char) > maxBytes) break;
    kept.push(char);
  }
  return trimEdge(kept.join(""));
}

function splitExtension(filename: string): { stem: string; ext: string } {
  const ext = filename.match(EXTENSION)?.[1] ?? "";
  return { stem: ext ? filename.slice(0, -ext.length) : filename, ext };
}

/** 把完整文件名（含扩展名）收到 maxBytes 以内，扩展名保留。 */
export function clampFilename(filename: string, maxBytes = MAX_FILENAME_BYTES): string {
  const { stem, ext } = splitExtension(filename);
  const budget = Math.max(1, maxBytes - filenameByteLength(ext));
  const cut = truncateToBytes(trimEdge(stem), budget) || truncateToBytes("untitled", budget) || "file";
  return cut + ext;
}

/** 先满足文件名字节上限，再按目录把整条路径收到当前系统的 PATH_MAX / MAX_PATH 内。 */
export function clampSaveFilename(
  directory: string,
  filename: string,
  platform: string,
  join: (directory: string, name: string) => string,
): string {
  const limit = pathLimit(platform);
  const measure = (name: string) => {
    const full = join(directory, name);
    return limit.unit === "chars" ? full.length : filenameByteLength(full);
  };
  let { stem, ext } = splitExtension(clampFilename(filename));
  let name = stem + ext;
  while (stem && measure(name) > limit.max) {
    stem = trimEdge(codePoints(stem).slice(0, -1).join(""));
    name = (stem || "untitled") + ext;
  }
  if (measure(name) > limit.max) name = `f${ext}`;
  return join(directory, name);
}
