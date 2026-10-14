import { createHash } from "node:crypto";

type Files = Record<string, string>;

/** Keep portable recovery copies of deleted notes and resources in the hidden layer.
 * A content-addressed name makes retries idempotent and avoids backing up backups. */
export function retainDeletedGitFiles(base: Files | undefined, local: Files, remote: Files, after: Files): Files {
  const result = { ...after };
  for (const name of new Set([...Object.keys(base ?? {}), ...Object.keys(local), ...Object.keys(remote)])) {
    if (name.split("/").some((part) => part.startsWith(".")) || result[name] !== undefined) continue;
    const content = local[name] ?? remote[name] ?? base?.[name];
    if (content === undefined) continue;
    const hash = createHash("sha256").update(Buffer.from(content, "base64")).digest("hex");
    const destination = `.goose/recovery/${name}/${hash}.json`;
    const record = JSON.stringify({ version: 1, relativePath: name, reason: "deleted", sha256: hash, encoding: "base64", content }, null, 2) + "\n";
    const encoded = Buffer.from(record).toString("base64");
    if (result[destination] !== undefined && result[destination] !== encoded) throw new Error("删除恢复记录发生冲突，原文件已保留");
    result[destination] = encoded;
  }
  return result;
}
