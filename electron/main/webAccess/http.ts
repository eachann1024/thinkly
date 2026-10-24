import { net } from "electron";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const TIMEOUT_MS = 15_000;
const MAX_BYTES = 3 * 1024 * 1024;

export async function fetchText(
  url: string,
  init: { accept?: string; headers?: Record<string, string> } = {},
): Promise<{ status: number; text: string; finalUrl: string; contentType: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await net.fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": BROWSER_UA,
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        Accept: init.accept ?? "text/html,application/xhtml+xml,*/*;q=0.8",
        ...init.headers,
      },
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    const sliced = buffer.byteLength > MAX_BYTES ? buffer.subarray(0, MAX_BYTES) : buffer;
    const contentType = response.headers.get("content-type") ?? "";
    return { status: response.status, text: decodeBody(sliced, contentType), finalUrl: response.url || url, contentType };
  } catch (error) {
    if (controller.signal.aborted) throw new Error("联网请求超时");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function decodeBody(buffer: Buffer, contentType: string) {
  const headerCharset = /charset=([\w-]+)/i.exec(contentType)?.[1];
  const head = buffer.subarray(0, 2048).toString("latin1");
  const metaCharset = /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1];
  const charset = (headerCharset ?? metaCharset ?? "utf-8").toLowerCase();
  try {
    return new TextDecoder(charset === "gb2312" ? "gbk" : charset).decode(buffer);
  } catch {
    return new TextDecoder("utf-8").decode(buffer);
  }
}

export async function fetchJson(url: string): Promise<unknown> {
  const { status, text } = await fetchText(url, { accept: "application/json" });
  if (status >= 400) throw new Error(`请求失败（HTTP ${status}）`);
  return JSON.parse(text);
}
