import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

export function distributionConfig() {
  const { baseUrl } = JSON.parse(readFileSync(new URL("../../config/desktop-distribution.json", import.meta.url), "utf8"));
  if (!baseUrl) return null;
  const url = new URL(baseUrl);
  assert.equal(url.protocol, "https:", "The public download address must use HTTPS");
  assert.ok(!url.username && !url.password && !url.search && !url.hash && !url.port,
    "The public download address cannot contain credentials, a port, query or fragment");
  assert.equal(url.href.replace(/\/$/, ""), baseUrl, "Use a normalized download address without a trailing slash");
  const bucket = process.env.OSS_BUCKET || "";
  const region = process.env.OSS_REGION || "";
  assert.match(bucket, /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/, "Configure OSS_BUCKET in repository variables");
  assert.match(region, /^oss-[a-z0-9-]+$/, "Configure OSS_REGION, for example oss-cn-hangzhou");
  const prefix = decodeURIComponent(url.pathname).replace(/^\/+|\/+$/g, "");
  assert.ok(!prefix || /^[a-z0-9][a-z0-9/_-]*$/i.test(prefix), "The download path must be a plain object prefix");
  return { baseUrl, bucket, region, prefix };
}

export const objectKey = (config, relative) => [config.prefix, relative].filter(Boolean).join("/");
export const publicAssetUrl = (config, tag, name) =>
  `${config.baseUrl}/releases/${encodeURIComponent(tag)}/${encodeURIComponent(name)}`;
