const MIME_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  ico: "image/x-icon",
  tif: "image/tiff",
  tiff: "image/tiff",
  html: "text/html",
  htm: "text/html",
  pdf: "application/pdf",
  txt: "text/plain",
  json: "application/json",
  csv: "text/csv",
  zip: "application/zip",
  mp4: "video/mp4",
  m4v: "video/x-m4v",
  mov: "video/quicktime",
  webm: "video/webm",
};

export function guessMime(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() || "png";
  return MIME_MAP[ext] || "image/png";
}
