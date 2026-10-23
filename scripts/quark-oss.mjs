import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { open, stat } from "node:fs/promises";
import { basename } from "node:path";
import { api, call, httpFailure, QuarkFailure, sanitize, withRetry, withUploadFile } from "./quark-api.mjs";
import { createSha1State, sha1Context, sha1Write } from "./quark-hash.mjs";

const PART_OSS_UA = "aliyun-sdk-js/1.0.0 Chrome Mobile 139.0.0.0 on Google Nexus 5 (Android 6.0)";
const COMMIT_OSS_UA = "aliyun-sdk-js/1.0.0 Chrome 139.0.0.0 on OS X 10.15.7 64-bit";

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

function ossDetail(body) {
  const code = /<Code>([^<]*)<\/Code>/i.exec(body)?.[1]?.trim() ?? "";
  const message = /<Message>([^<]*)<\/Message>/i.exec(body)?.[1]?.trim() ?? "";
  if (!code && !message) return "响应无 OSS 错误码";
  return sanitize(`${code}${message ? `：${message}` : ""}`);
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

function partAuthMeta(session, partNumber, date, hashCtx) {
  const signed = [`x-oss-date:${date}`];
  if (hashCtx) signed.push(`x-oss-hash-ctx:${hashCtx}`);
  signed.push(`x-oss-user-agent:${PART_OSS_UA}`);
  return [
    "PUT", "", session.mime, date, ...signed,
    `/${session.bucket}/${session.objKey}?partNumber=${partNumber}&uploadId=${session.uploadId}`,
  ].join("\n");
}

function etagFrom(response, body) {
  if (response.status === 200) {
    const etag = (response.headers.get("etag") ?? "").replaceAll('"', "");
    if (!etag) throw new QuarkFailure("分片上传未返回校验值");
    return etag;
  }
  if (response.status === 409 && /PartAlreadyExist/i.test(body)) {
    return /<PartEtag>\s*"?([^"<]+)"?\s*<\/PartEtag>/i.exec(body)?.[1]?.replaceAll('"', "") ?? "";
  }
  return "";
}

async function putPart(cookie, session, partNumber, bytes, hashCtx) {
  return withRetry({ step: `分片上传 #${partNumber}` }, async () => {
    const date = ossDate();
    const authKey = await authorize(cookie, session.taskId, session.authInfo, partAuthMeta(session, partNumber, date, hashCtx));
    const headers = {
      Authorization: authKey,
      "Content-Type": session.mime,
      "Content-Length": String(bytes.length),
      Referer: "https://pan.quark.cn/",
      "x-oss-date": date,
      "x-oss-user-agent": PART_OSS_UA,
    };
    if (hashCtx) headers["x-oss-hash-ctx"] = hashCtx;
    const response = await call(ossTarget(session.bucket, session.objKey, {
      partNumber, uploadId: session.uploadId,
    }), { method: "PUT", headers, body: bytes }, 300_000);
    const body = await response.text();
    const etag = etagFrom(response, body);
    if (!etag) throw httpFailure(`分片上传失败（HTTP ${response.status}）：${ossDetail(body)}`, response.status, `part_upload_http_${response.status}`);
    return etag;
  });
}

async function completeUpload(cookie, session, parts) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<CompleteMultipartUpload>\n${
    parts.map((part) => `<Part>\n<PartNumber>${part.partNumber}</PartNumber>\n<ETag>"${part.etag}"</ETag>\n</Part>`).join("\n")
  }\n</CompleteMultipartUpload>`;
  const contentMd5 = createHash("md5").update(xml).digest("base64");
  const callback = Buffer.from(JSON.stringify(session.callback)).toString("base64");
  return withRetry({ step: "提交分片" }, async () => {
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
        "Content-Length": String(Buffer.byteLength(xml)),
        Referer: "https://pan.quark.cn/",
        "x-oss-callback": callback,
        "x-oss-date": date,
        "x-oss-user-agent": COMMIT_OSS_UA,
      },
      body: xml,
    }, 60_000);
    const body = await response.text();
    if (response.status === 200 || response.status === 203) {
      if (response.status === 203) console.log("分片完成回调返回 HTTP 203，继续向夸克确认");
      return responseFid(body);
    }
    throw httpFailure(`完成分片上传失败（HTTP ${response.status}）：${ossDetail(body)}`, response.status, `complete_upload_http_${response.status}`);
  });
}

function responseFid(body) {
  return /"fid"\s*:\s*"([0-9A-Za-z_-]{6,80})"/.exec(body)?.[1] ?? "";
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function confirmFinish(cookie, taskId, objKey, fallbackFid) {
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const payload = await api(cookie, "POST", "file/upload/finish", {
        body: { task_id: taskId, ...(objKey ? { obj_key: objKey } : {}) },
      });
      const data = payload.data ?? {};
      if (data.finish === true) {
        const fid = String(data.fid || fallbackFid || "");
        if (fid) return fid;
        const missing = new QuarkFailure("完成上传后没有文件编号");
        missing.reason = "rename_target_missing";
        throw missing;
      }
      if (attempt < 5) {
        console.log(`完成确认未就绪，第 ${attempt} 次后重试`);
        await delay(attempt * 1000);
      }
    } catch (error) {
      if (error?.cookie || error?.reason === "cookie_invalid" || error?.reason === "rename_target_missing" || error?.final || error?.retryable === false) throw error;
      lastError = error;
      if (attempt < 5) await delay(attempt * 1000);
    }
  }
  if (lastError) {
    if (!lastError.reason) lastError.reason = "finish_not_ready";
    throw lastError;
  }
  const failure = new QuarkFailure("完成上传后服务器未确认文件");
  failure.reason = "finish_not_ready";
  throw failure;
}

async function startUpload(cookie, parentId, file, remoteName = basename(file)) {
  const name = remoteName;
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
  const preparedFid = String(data.fid ?? "");
  if (data.finish === true) return { fid: await confirmFinish(cookie, data.task_id, data.obj_key, preparedFid) };
  const hashed = await api(cookie, "POST", "file/update/hash", {
    body: { md5: hashes.md5, sha1: hashes.sha1, task_id: data.task_id },
  });
  const hashedFid = String(hashed.data?.fid ?? preparedFid);
  if (hashed.data?.finish === true) return { fid: await confirmFinish(cookie, data.task_id, data.obj_key, hashedFid) };
  const partSize = Number(prepared.metadata?.part_size);
  if (!Number.isInteger(partSize) || partSize < 1) throw new QuarkFailure(`预上传未返回分片大小：${name}`);
  const session = {
    taskId: data.task_id, bucket: data.bucket, objKey: data.obj_key, uploadId: data.upload_id,
    authInfo: data.auth_info, callback: data.callback, mime: data.format_type || formatType(name),
  };
  if (!session.bucket || !session.objKey || !session.uploadId || !session.authInfo || !session.callback) {
    throw new QuarkFailure(`预上传缺少上传参数：${name}`);
  }
  const state = createSha1State();
  const parts = [];
  const count = Math.ceil(size / partSize);
  console.log(`${name} 按 ${partSize} 字节分 ${count} 片上传`);
  for (let offset = 0, partNumber = 1; offset < size; partNumber += 1) {
    const length = Math.min(partSize, size - offset);
    const bytes = await readPart(file, offset, length);
    const hashCtx = partNumber > 1 ? sha1Context(state) : "";
    parts.push({ partNumber, etag: await putPart(cookie, session, partNumber, bytes, hashCtx) });
    sha1Write(state, bytes);
    offset += length;
  }
  const callbackFid = await completeUpload(cookie, session, parts);
  return { fid: await confirmFinish(cookie, session.taskId, session.objKey, callbackFid || preparedFid) };
}

export function uploadFile(cookie, parentId, file, remoteName = basename(file)) {
  return withUploadFile(remoteName, () => startUpload(cookie, parentId, file, remoteName));
}
