const API = "https://drive-pc.quark.cn/1/clouddrive";
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

export class QuarkFailure extends Error {}

function cookieFailure(message, reason) {
  const error = new QuarkFailure(message);
  error.cookie = true;
  error.reason = reason;
  return error;
}

export function sanitize(message) {
  return String(message).replace(/https?:\/\/\S+/g, "[url]").replace(/auth_key[=:][^\s,]+/gi, "auth_key=[redacted]").slice(0, 300);
}

export function redactSecrets(text) {
  let output = String(text);
  for (const key of ["QUARK_COOKIE", "GH_TOKEN", "GITHUB_TOKEN"]) {
    const secret = process.env[key]?.trim();
    if (!secret || secret.length < 8) continue;
    output = output.split(secret).join("[redacted]");
  }
  return output.replace(/https?:\/\/\S+/g, "[url]").replace(/auth_key[=:][^\s,]+/gi, "auth_key=[redacted]");
}

export async function call(url, options, timeoutMs) {
  try {
    return await fetch(url, { ...options, redirect: "manual", signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") throw new QuarkFailure("夸克请求超时");
    throw new QuarkFailure("夸克网络请求失败");
  }
}

function apiUrl(path, query = {}) {
  const url = new URL(`${API}/${path.replace(/^\//, "")}`);
  url.searchParams.set("pr", "ucpro");
  url.searchParams.set("fr", "pc");
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value));
  return url;
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); }
  catch { throw new QuarkFailure(`夸克响应无法解析（HTTP ${response.status}）`); }
}

function assertApi(response, payload) {
  if (response.status === 401 || payload.code === 31001 || payload.status === 401) {
    throw cookieFailure("夸克 Cookie 失效", "cookie_invalid");
  }
  if (response.status >= 300 || (payload.code && payload.code !== 0) || (typeof payload.status === "number" && payload.status >= 400)) {
    const message = typeof payload.message === "string" && !/https?:|cookie|token|auth/i.test(payload.message)
      ? payload.message.slice(0, 160) : `HTTP ${response.status}`;
    throw new QuarkFailure(`夸克请求失败：${sanitize(message)}`);
  }
}

export async function api(cookie, method, path, { query, body, timeoutMs = 30_000 } = {}) {
  const response = await call(apiUrl(path, query), {
    method,
    headers: {
      Cookie: cookie,
      Referer: "https://pan.quark.cn/",
      Origin: "https://pan.quark.cn",
      "User-Agent": BROWSER_UA,
      Accept: "application/json, text/plain, */*",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  }, timeoutMs);
  const payload = await readJson(response);
  assertApi(response, payload);
  return payload;
}

export function readCookie() {
  const cookie = process.env.QUARK_COOKIE?.trim() ?? "";
  if (!cookie) throw cookieFailure("夸克 Cookie 未配置（QUARK_COOKIE）", "not_configured");
  return cookie;
}

export async function assertCookie(cookie) {
  await api(cookie, "GET", "config");
}

function isDirectory(item) {
  return item?.file === false || item?.dir === true || item?.file_type === 0;
}

export async function listChildren(cookie, parentId) {
  const files = [];
  for (let page = 1; page <= 20; page += 1) {
    const payload = await api(cookie, "GET", "file/sort", {
      query: {
        pdir_fid: parentId, _page: page, _size: 200, _fetch_total: 1,
        fetch_all_file: 1, fetch_risk_file_name: 1,
      },
    });
    const list = Array.isArray(payload.data?.list) ? payload.data.list : [];
    files.push(...list);
    const total = Number(payload.metadata?._total ?? files.length);
    if (list.length === 0 || files.length >= total) break;
  }
  return files;
}

export async function ensureFolder(cookie, name) {
  const found = (await listChildren(cookie, "0")).find((item) => item.file_name === name && isDirectory(item));
  if (found?.fid) return String(found.fid);
  const created = await api(cookie, "POST", "file", {
    body: { pdir_fid: "0", file_name: name, dir_path: "", dir_init_lock: false },
  });
  const fid = created.data?.fid ?? created.data?.list?.[0]?.fid;
  if (fid) return String(fid);
  const again = (await listChildren(cookie, "0")).find((item) => item.file_name === name && isDirectory(item));
  if (again?.fid) return String(again.fid);
  throw new QuarkFailure("未能准备夸克目录");
}

export async function renameFile(cookie, fid, fileName) {
  try {
    await api(cookie, "POST", "file/rename", { body: { fid, file_name: fileName } });
  } catch (error) {
    if (error && !error.reason) error.reason = "rename_failed";
    throw error;
  }
}

export async function deleteFiles(cookie, ids) {
  const filelist = [...new Set(ids.filter(Boolean))];
  if (filelist.length === 0) return;
  await api(cookie, "POST", "file/delete", { body: { action_type: 2, filelist, exclude_fids: [] } });
}

