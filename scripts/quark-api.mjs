import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { open, stat } from "node:fs/promises";
import { basename } from "node:path";

const API = "https://drive-pc.quark.cn/1/clouddrive";
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const PART_OSS_UA = "aliyun-sdk-js/1.0.0 Chrome Mobile 139.0.0.0 on Google Nexus 5 (Android 6.0)";
const COMMIT_OSS_UA = "aliyun-sdk-js/1.0.0 Chrome 139.0.0.0 on OS X 10.15.7 64-bit";

export class QuarkFailure extends Error {}

function cookieFailure(message) {
  const error = new QuarkFailure(message);
  error.cookie = true;
  return error;
}

function sanitize(message) {
  return String(message).replace(/https?:\/\/\S+/g, "[url]").replace(/auth_key[=:][^\s,]+/gi, "auth_key=[redacted]").slice(0, 300);
}

async function call(url, options, timeoutMs) {
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
    throw cookieFailure("夸克 Cookie 失效");
  }
  if (response.status >= 300 || (payload.code && payload.code !== 0) || (typeof payload.status === "number" && payload.status >= 400)) {
    const message = typeof payload.message === "string" && !/https?:|cookie|token|auth/i.test(payload.message)
      ? payload.message.slice(0, 160) : `HTTP ${response.status}`;
    throw new QuarkFailure(`夸克请求失败：${sanitize(message)}`);
  }
}

async function api(cookie, method, path, { query, body, timeoutMs = 30_000 } = {}) {
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
  if (!cookie) throw cookieFailure("夸克 Cookie 未配置（QUARK_COOKIE）");
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
      query: { pdir_fid: parentId, _page: page, _size: 200, _fetch_total: 1 },
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
  await api(cookie, "POST", "file/rename", { body: { fid, file_name: fileName } });
}

export async function deleteFiles(cookie, ids) {
  const filelist = [...new Set(ids.filter(Boolean))];
  if (filelist.length === 0) return;
  await api(cookie, "POST", "file/delete", { body: { action_type: 2, filelist, exclude_fids: [] } });
}

function formatType(name) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".txt")) return "text/plain";
  if (lower.endsWith(".dmg")) return "application/x-apple-diskimage";
  if (lower.endsWith(".exe")) return "application/vnd.microsoft.portable-executable";
  if (lower.endsWith(".deb")) return "application/vnd.debian.binary-package";
  return "application/octet-stream";
}

function hashFile(file) {
  return new Promise((resolve, reject) => {
    const md5 = createHash("md5");
    const sha1 = createHash("sha1");
    const stream = createReadStream(file);
    stream.on("data", (chunk) => { md5.update(chunk); sha1.update(chunk); });
    stream.on("error", reject);
    stream.on("end", () => resolve({ md5: md5.digest("hex"), sha1: sha1.digest("hex") }));
  });
}

function ossDate() {
  return new Date().toUTCString();
}

function ossTarget(bucket, objKey, query) {
  if (!/^[a-z0-9][a-z0-9.-]{1,62}$/i.test(bucket) || !/^[\w./-]+$/.test(objKey) || objKey.includes("..")) {
    throw new QuarkFailure("上传参数无效");
  }
  const qs = Object.entries(query).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join("&");
  return `https://${bucket}.pds.quark.cn/${objKey}?${qs}`;
}

async function authorize(cookie, taskId, authInfo, authMeta) {
  const payload = await api(cookie, "POST", "file/upload/auth", {
    body: { task_id: taskId, auth_info: authInfo, auth_meta: authMeta },
  });
  const authKey = payload.data?.auth_key;
  if (!authKey) throw new QuarkFailure("获取上传授权失败");
  return authKey;
}

async function readPart(file, offset, length) {
  const handle = await open(file, "r");
  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, offset);
    if (bytesRead !== length) throw new QuarkFailure("读取安装包失败");
    return buffer;
  } finally {
    await handle.close();
  }
}

async function putPart(cookie, session, partNumber, bytes) {
  let last = "分片上传失败";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const date = ossDate();
      const authMeta = [
        "PUT", "", session.mime, date,
        `x-oss-date:${date}`,
        `x-oss-user-agent:${PART_OSS_UA}`,
        `/${session.bucket}/${session.objKey}?partNumber=${partNumber}&uploadId=${session.uploadId}`,
      ].join("\n");
      const authKey = await authorize(cookie, session.taskId, session.authInfo, authMeta);
      const response = await call(ossTarget(session.bucket, session.objKey, {
        partNumber, uploadId: session.uploadId,
      }), {
        method: "PUT",
        headers: {
          Authorization: authKey,
          "Content-Type": session.mime,
          Referer: "https://pan.quark.cn/",
          "x-oss-date": date,
          "x-oss-user-agent": PART_OSS_UA,
        },
        body: Buffer.from(bytes),
      }, 300_000);
      if (response.status !== 200) throw new QuarkFailure(`分片上传失败（HTTP ${response.status}）`);
      const etag = (response.headers.get("etag") ?? "").replaceAll('"', "");
      if (!etag) throw new QuarkFailure("分片上传未返回校验值");
      return etag;
    } catch (error) {
      if (error?.cookie || String(error?.message).includes("夸克 Cookie")) throw error;
      last = sanitize(error instanceof Error ? error.message : last);
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  throw new QuarkFailure(`分片 ${partNumber} 上传失败：${last}`);
}

async function completeUpload(cookie, session, parts) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<CompleteMultipartUpload>\n${
    parts.map((part) => `<Part>\n<PartNumber>${part.partNumber}</PartNumber>\n<ETag>"${part.etag}"</ETag>\n</Part>`).join("\n")
  }\n</CompleteMultipartUpload>`;
  const contentMd5 = createHash("md5").update(xml).digest("base64");
  const callback = Buffer.from(JSON.stringify(session.callback)).toString("base64");
  const date = ossDate();
  const authMeta = [
    "POST", contentMd5, "application/xml", date,
    `x-oss-callback:${callback}`,
    `x-oss-date:${date}`,
    `x-oss-user-agent:${COMMIT_OSS_UA}`,
    `/${session.bucket}/${session.objKey}?uploadId=${session.uploadId}`,
  ].join("\n");
  const authKey = await authorize(cookie, session.taskId, session.authInfo, authMeta);
  const response = await call(ossTarget(session.bucket, session.objKey, { uploadId: session.uploadId }), {
    method: "POST",
    headers: {
      Authorization: authKey,
      "Content-MD5": contentMd5,
      "Content-Type": "application/xml",
      Referer: "https://pan.quark.cn/",
      "x-oss-callback": callback,
      "x-oss-date": date,
      "x-oss-user-agent": COMMIT_OSS_UA,
    },
    body: xml,
  }, 60_000);
  if (response.status !== 200 && response.status !== 203) {
    throw new QuarkFailure(`完成分片上传失败（HTTP ${response.status}）`);
  }
}

export async function uploadFile(cookie, parentId, file) {
  const name = basename(file);
  const { size } = await stat(file);
  const now = Date.now();
  const hashes = await hashFile(file);
  const prepared = await api(cookie, "POST", "file/upload/pre", {
    body: {
      ccp_hash_update: true, parallel_upload: true, pdir_fid: parentId, dir_name: "",
      size, file_name: name, format_type: formatType(name), l_updated_at: now, l_created_at: now,
    },
  });
  const data = prepared.data ?? {};
  if (!data.task_id) throw new QuarkFailure(`预上传失败：${name}`);
  if (data.finish === true) return;
  const hashed = await api(cookie, "POST", "file/update/hash", {
    body: { md5: hashes.md5, sha1: hashes.sha1, task_id: data.task_id },
  });
  if (hashed.data?.finish === true) return;
  const partSize = Number(prepared.metadata?.part_size);
  if (!Number.isInteger(partSize) || partSize < 1) throw new QuarkFailure(`预上传未返回分片大小：${name}`);
  const session = {
    taskId: data.task_id, bucket: data.bucket, objKey: data.obj_key, uploadId: data.upload_id,
    authInfo: data.auth_info, callback: data.callback, mime: data.format_type || formatType(name),
  };
  if (!session.bucket || !session.objKey || !session.uploadId || !session.authInfo || !session.callback) {
    throw new QuarkFailure(`预上传缺少上传参数：${name}`);
  }
  const parts = [];
  for (let offset = 0, partNumber = 1; offset < size; partNumber += 1) {
    const length = Math.min(partSize, size - offset);
    const bytes = await readPart(file, offset, length);
    parts.push({ partNumber, etag: await putPart(cookie, session, partNumber, bytes) });
    offset += length;
  }
  await completeUpload(cookie, session, parts);
  await api(cookie, "POST", "file/upload/finish", { body: { obj_key: session.objKey, task_id: session.taskId } });
}
