import { ipcMain } from "electron";
import { builtinWebSearch } from "../webAccess/search";
import { builtinReadPage } from "../webAccess/read";
import { fetchJson } from "../webAccess/http";

/** 只有这些公开数据接口可经主进程取 JSON，供 AI 信息卡片使用，避免成为任意代理。 */
const JSON_HOSTS = new Set([
  "geocoding-api.open-meteo.com",
  "api.open-meteo.com",
  "api.frankfurter.app",
  "api.frankfurter.dev",
  "open.er-api.com",
  "api.coingecko.com",
]);

export function registerWebIpc(): void {
  ipcMain.handle("desktop:web-search", async (_event, query: string, limit?: number) =>
    builtinWebSearch(String(query ?? ""), Math.max(1, Math.min(8, Number(limit) || 6))),
  );
  ipcMain.handle("desktop:web-read", async (_event, url: string) => builtinReadPage(String(url ?? "")));
  ipcMain.handle("desktop:web-json", async (_event, url: string) => {
    const parsed = new URL(String(url ?? ""));
    if (parsed.protocol !== "https:" || !JSON_HOSTS.has(parsed.hostname)) throw new Error("不支持的数据接口");
    return fetchJson(parsed.toString());
  });
}
