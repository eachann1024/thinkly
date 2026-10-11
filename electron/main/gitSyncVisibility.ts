import { type GitRepositoryInput, type GitRepositoryVisibility, normalizedGitRemote } from "../../src/lib/git-sync-contract";

export function parseGitVisibility(body: unknown, checkedAt = new Date().toISOString()): GitRepositoryVisibility {
  const privateValue = body && typeof body === "object" ? (body as { private?: unknown }).private : undefined;
  return { value: privateValue === true ? "private" : privateValue === false ? "public" : "unknown", checkedAt, reason: typeof privateValue === "boolean" ? null : "仓库服务未返回明确的可见性" };
}

export async function checkGitVisibility(config: GitRepositoryInput, token?: string, fetcher: typeof fetch = fetch): Promise<GitRepositoryVisibility> {
  const checkedAt = new Date().toISOString();
  const repository = normalizedGitRemote(config).replace(/^git@[^:]+:/, "").replace(/\.git$/, "");
  const url = new URL(config.provider === "github" ? `https://api.github.com/repos/${repository}` : `https://gitee.com/api/v5/repos/${repository}`);
  const headers: Record<string, string> = { Accept: "application/json", "User-Agent": "Goose-Notes" };
  if (token) {
    if (config.provider === "github") headers.Authorization = `Bearer ${token}`;
    // Gitee's official /api/v5/doc_json specifies access_token as a query parameter.
    // Neither this URL nor any fetch exception is returned or logged.
    else url.searchParams.set("access_token", token);
  }
  try {
    const response = await fetcher(url, { headers, redirect: "error", signal: AbortSignal.timeout(15_000) });
    if (!response.ok) {
      const limited = response.status === 429 || (response.status === 403 && (response.headers.get("x-ratelimit-remaining") === "0" || response.headers.has("retry-after")));
      return { value: "unknown", checkedAt, reason: limited ? "检查请求受限，请稍后重试；不影响 SSH 同步" : response.status === 401 ? "检查凭据无效或已过期，请更新检查凭据；不影响 SSH 同步" : response.status === 403 ? "当前检查凭据权限不足或请求被拒绝；不影响 SSH 同步" : response.status === 404 ? "仓库不存在或当前检查凭据无权查看；请核对仓库地址" : `仓库服务暂不可用（${response.status}）；不影响 SSH 同步` };
    }
    return parseGitVisibility(await response.json(), checkedAt);
  } catch {
    return { value: "unknown", checkedAt, reason: "无法检查仓库可见性：网络、超时、重定向或响应异常" };
  }
}
