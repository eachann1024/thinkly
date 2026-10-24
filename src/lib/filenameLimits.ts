
const encoder = new TextEncoder();
const EXTENSION = /(\.[A-Za-z0-9]{1,12})$/;

export const MAX_FILENAME_BYTES = 255;

export function utf8ByteLength(value: string): number {
  return encoder.encode(value).length;
}

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

export function clampFilename(filename: string, maxBytes = MAX_FILENAME_BYTES): string {
  const { stem, ext } = splitExtension(filename);
  const budget = Math.max(1, maxBytes - filenameByteLength(ext));
  const cut = truncateToBytes(trimEdge(stem), budget) || truncateToBytes("untitled", budget) || "file";
  return cut + ext;
}

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
