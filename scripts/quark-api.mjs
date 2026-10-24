import { AsyncLocalStorage } from "node:async_hooks";

const API = "https://drive-pc.quark.cn/1/clouddrive";
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const RETRIES = 4;
const fileContext = new AsyncLocalStorage();
const STEPS = {
  "GET config": "校验 Cookie",
  "GET file/sort": "列出目录",
  "POST file": "建目录",
  "POST file/rename": "重命名",
  "POST file/delete": "删除文件",
  "POST file/upload/pre": "预上传",
  "POST file/upload/auth": "获取上传授权",
  "POST file/upload/finish": "完成确认",
  "POST file/update/hash": "提交哈希",
};

export class QuarkFailure extends Error {}

export function withUploadFile(file, fn) {
  return fileContext.run(file, fn);
}

function cookieFailure(message, reason) {
  const error = new QuarkFailure(message);
  error.cookie = true;
  error.reason = reason;
  error.retryable = false;
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

function errorCode(error) {
  const seen = new Set();
  const queue = [error];
  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    if (typeof current.code === "string" && current.code) return current.code;
    if (current.cause) queue.push(current.cause);
    if (Array.isArray(current.errors)) queue.push(...current.errors);
  }
  if (error?.name === "TimeoutError" || error?.name === "AbortError") return error.name;
  return "";
}

function isTimeout(error, code) {
  return error?.name === "TimeoutError" || error?.name === "AbortError"
    || code === "ETIMEDOUT" || code === "UND_ERR_CONNECT_TIMEOUT"
    || code === "UND_ERR_HEADERS_TIMEOUT" || code === "UND_ERR_BODY_TIMEOUT";
}

function networkFailure(error) {
  const code = errorCode(error) || "network";
  const timedOut = isTimeout(error, code);
  const failure = new QuarkFailure(timedOut ? `夸克请求超时（${code}）` : `夸克网络请求失败（${code}）`);
  failure.reason = timedOut ? "timeout" : "network";
  failure.retryable = true;
  failure.code = code;
  return failure;
}

function normalizeError(error) {
  if (error instanceof QuarkFailure) return error;
  const code = errorCode(error);
  if (isTimeout(error, code) || code || /fetch failed/i.test(String(error?.message ?? ""))) return networkFailure(error);
  return error instanceof Error ? error : new QuarkFailure(String(error ?? "夸克请求失败"));
}

export async function call(url, options, timeoutMs) {
  try {
    return await fetch(url, { ...options, redirect: "manual", signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    throw networkFailure(error);
  }
}

function retryDelay(retry) {
  const base = 2000 * 2 ** (retry - 1);
  return base + Math.floor(Math.random() * Math.floor(base * 0.2));
}

function causeLabel(error) {
  if (typeof error?.status === "number" && error.status >= 400) return `HTTP ${error.status}`;
  if (typeof error?.code === "string" && error.code) return error.code;
  const status = /HTTP (\d+)/.exec(String(error?.message ?? ""))?.[1];
  return status ? `HTTP ${status}` : "unknown";
}

function contextOf(meta) {
  return {
    step: meta?.step || "夸克请求",
    file: meta?.file || fileContext.getStore() || "",
  };
}

function describe(error, meta, retries) {
  const { step, file } = contextOf(meta);
  const where = file ? `${step} 文件=${file}` : step;
  return `${where} 失败：${causeLabel(error)}，已重试 ${retries} 次`;
}

function isRetryable(error) {
  if (!error || error.final || error.cookie || error.retryable === false) return false;
  if (error.reason === "cookie_invalid" || error.reason === "not_configured") return false;
  if (error.retryable === true) return true;
  const status = typeof error.status === "number" ? error.status : Number(/HTTP (\d+)/.exec(String(error?.message ?? ""))?.[1]);
  return status === 429 || status >= 500;
}

function finishError(error, meta, retries) {
  if (error?.final) return error;
  const wrapped = error instanceof Error ? error : new QuarkFailure(String(error ?? "夸克请求失败"));
  const summary = describe(wrapped, meta, retries);
  const detail = sanitize(wrapped.message || "");
  const extra = detail && detail !== summary && !detail.includes("已重试") ? `；${detail}` : "";
  wrapped.message = `${summary}${extra}`;
  const { step, file } = contextOf(meta);
  wrapped.step = step;
  if (file) wrapped.file = file;
  wrapped.retries = retries;
  wrapped.final = true;
  wrapped.retryable = false;
  return wrapped;
}

export async function withRetry(meta, fn) {
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      const current = normalizeError(error);
      if (!isRetryable(current) || attempt === RETRIES) throw finishError(current, meta, attempt);
      const wait = retryDelay(attempt + 1);
      const { step, file } = contextOf(meta);
      console.log(`夸克将重试 step=${step}${file ? ` file=${file}` : ""} cause=${causeLabel(current)} retry=${attempt + 1} waitMs=${wait}`);
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
  throw new QuarkFailure("夸克请求失败");
}

function stepFor(method, path) {
  return STEPS[`${method} ${String(path).replace(/^\//, "")}`] || "夸克请求";
}

export function httpFailure(message, status, reason) {
  const error = new QuarkFailure(message);
  if (reason) error.reason = reason;
  if (typeof status === "number" && status >= 400) error.status = status;
  error.retryable = status === 429 || status >= 500;
  return error;
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
  catch { throw httpFailure(`夸克响应无法解析（HTTP ${response.status}）`, response.status); }
}

function assertApi(response, payload) {
  if (response.status === 401 || payload.code === 31001 || payload.status === 401) {
    const error = cookieFailure("夸克 Cookie 失效", "cookie_invalid");
    if (response.status >= 400) error.status = response.status;
    else if (payload.code) error.code = String(payload.code);
    else error.status = 401;
    throw error;
  }
  if (response.status >= 300 || (payload.code && payload.code !== 0) || (typeof payload.status === "number" && payload.status >= 400)) {
    const message = typeof payload.message === "string" && !/https?:|cookie|token|auth/i.test(payload.message)
      ? payload.message.slice(0, 160) : `HTTP ${response.status}`;
    const error = httpFailure(`夸克请求失败：${sanitize(message)}`, response.status >= 400 ? response.status : undefined);
    if (typeof error.status !== "number" && payload.code) error.code = String(payload.code);
    throw error;
  }
}

export async function api(cookie, method, path, { query, body, timeoutMs = 30_000 } = {}) {
  const file = typeof body?.file_name === "string" ? body.file_name : "";
  return withRetry({ step: stepFor(method, path), file }, async () => {
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
  });
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
