/** 应用内拖拽只传来源标识和内容快照，落点再读取当前页面状态。 */
export const GOOSE_PAGE_MIME = "application/x-goose-page";
export const GOOSE_TEXT_MIME = "application/x-goose-text";
export const GOOSE_FOLDER_MIME = "application/x-goose-folder";

export type WorkspaceDragPayload =
  | { kind: "page"; pageId: string }
  | {
      kind: "text";
      text: string;
      pageId?: string;
      pageTitle?: string;
      language?: string;
    };

function typesOf(data: DataTransfer): string[] {
  return Array.from(data.types ?? []);
}

/** dragover 处于 protected 模式，只能用 MIME 判断；内容在 drop 时验证。 */
export function hasWorkspaceDrag(data: DataTransfer): boolean {
  const types = typesOf(data);
  if (types.includes(GOOSE_FOLDER_MIME)) return false;
  if (types.includes(GOOSE_PAGE_MIME) || types.includes(GOOSE_TEXT_MIME)) return true;
  return !types.includes("Files") && types.includes("text/plain");
}

function parseData(data: DataTransfer, mime: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(data.getData(mime));
    return value && typeof value === "object" ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function isFilePath(text: string): boolean {
  const value = text.trim();
  if (/[\r\n]/.test(value)) return false;
  return /^(?:file:\/\/|[a-z]:[\\/]|\\\\)/i.test(value) || /^\/(?![/*])[^\n]+$/.test(value);
}

export function readWorkspaceDrag(data: DataTransfer): WorkspaceDragPayload | null {
  const types = typesOf(data);
  if (types.includes(GOOSE_FOLDER_MIME)) return null;
  if (types.includes(GOOSE_PAGE_MIME)) {
    const payload = parseData(data, GOOSE_PAGE_MIME);
    const pageId = optionalText(payload?.pageId);
    return payload?.kind === "page" && pageId ? { kind: "page", pageId } : null;
  }
  if (types.includes(GOOSE_TEXT_MIME)) {
    const payload = parseData(data, GOOSE_TEXT_MIME);
    if (payload?.kind !== "text" || typeof payload.text !== "string" || !payload.text.trim()) return null;
    return {
      kind: "text", text: payload.text,
      pageId: optionalText(payload.pageId),
      pageTitle: optionalText(payload.pageTitle),
      language: optionalText(payload.language),
    };
  }
  if (types.includes("Files") || !types.includes("text/plain")) return null;
  const text = data.getData("text/plain").replace(/\r\n?/g, "\n");
  const html = data.getData("text/html");
  if (!text.trim() || isFilePath(text) || /<img\b/i.test(html)) return null;
  return { kind: "text", text };
}

/** 保留树组件写入的数据与外部路径，应用内额外携带稳定的 pageId。 */
export function writePageDrag(data: DataTransfer, pageId: string): void {
  data.setData(GOOSE_PAGE_MIME, JSON.stringify({ kind: "page", pageId }));
}

/** 文件夹只参与目录树移动，禁止把树组件的回退文本当成正文。 */
export function writeFolderDrag(data: DataTransfer, pageId: string): void {
  data.setData(GOOSE_FOLDER_MIME, JSON.stringify({ pageId }));
}

export function writeTextDrag(
  data: DataTransfer,
  payload: Extract<WorkspaceDragPayload, { kind: "text" }>,
): void {
  data.setData(GOOSE_TEXT_MIME, JSON.stringify(payload));
  data.setData("text/plain", payload.text);
}
