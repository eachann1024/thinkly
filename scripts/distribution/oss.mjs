import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import OSS from "ali-oss";
import { objectKey } from "./config.mjs";

export async function sha256(file) {
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(file)) digest.update(chunk);
  return digest.digest("hex");
}

export function ossClient(config) {
  const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
  assert.ok(accessKeyId && accessKeySecret, "Configure the OSS publisher credentials in GitHub Actions secrets");
  return new OSS({
    bucket: config.bucket, region: config.region, secure: true, authorizationV4: true,
    accessKeyId, accessKeySecret, stsToken: process.env.OSS_SECURITY_TOKEN || undefined,
    timeout: 120_000,
  });
}

function safeError(error) {
  // SDK errors can contain request headers. Keep credentials out of CI output.
  const code = /^[A-Za-z0-9_-]+$/.test(error?.code || "") ? error.code : "RequestFailed";
  return new Error(`OSS ${code}${Number.isInteger(error?.status) ? ` (${error.status})` : ""}`);
}

export async function readJson(client, key) {
  try {
    const result = await client.get(key);
    return JSON.parse(result.content.toString("utf8"));
  } catch (error) {
    if (error?.code === "NoSuchKey") return null;
    throw safeError(error);
  }
}

export async function uploadInstaller(client, config, tag, name, file, digest) {
  const key = objectKey(config, `releases/${tag}/${name}`);
  const { size } = await stat(file);
  assert.equal(await sha256(file), digest, `Installer checksum mismatch: ${name}`);
  try {
    let existing;
    try { existing = await client.head(key); }
    catch (error) { if (error?.code !== "NoSuchKey") throw error; }
    if (existing) {
      assert.equal(existing.meta?.sha256, digest, `Published object must not be replaced: ${name}`);
      assert.equal(Number(existing.res.headers["content-length"]), size, `Published size mismatch: ${name}`);
    } else {
      await client.multipartUpload(key, file, {
        partSize: 5 * 1024 * 1024, parallel: 3,
        meta: { sha256: digest },
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Type": name.endsWith(".zip") ? "application/zip" : "application/octet-stream",
          "Content-Disposition": `attachment; filename="${name}"`,
          "x-oss-forbid-overwrite": "true",
        },
      });
      const uploaded = await client.head(key);
      assert.equal(uploaded.meta?.sha256, digest, `Uploaded checksum metadata mismatch: ${name}`);
      assert.equal(Number(uploaded.res.headers["content-length"]), size, `Uploaded size mismatch: ${name}`);
    }
  } catch (error) {
    if (error?.code === "ERR_ASSERTION") throw error;
    throw safeError(error);
  }
}

export async function uploadText(client, config, relative, content, type, immutable = false) {
  try {
    const key = objectKey(config, relative);
    const buffer = Buffer.from(content);
    if (immutable) {
      let existing;
      try { existing = await client.get(key); }
      catch (error) { if (error?.code !== "NoSuchKey") throw error; }
      if (existing) {
        assert.ok(existing.content.equals(buffer), `Published content must not be replaced: ${relative}`);
        return;
      }
    }
    await client.put(key, buffer, {
      headers: {
        "Content-Type": `${type}; charset=utf-8`,
        "Cache-Control": immutable ? "public, max-age=31536000, immutable" : "no-store, max-age=0",
        ...(immutable ? { "x-oss-forbid-overwrite": "true" } : {}),
      },
    });
  } catch (error) {
    if (error?.code === "ERR_ASSERTION") throw error;
    throw safeError(error);
  }
}
