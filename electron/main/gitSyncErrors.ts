/** Classify known transport failures without sending stderr or command args to
 * the renderer: those can contain private paths, remote output or credentials. */
export function gitFailureMessage(error: unknown): string {
  const failure = error as { code?: string; killed?: boolean; stderr?: Buffer | string; message?: string };
  if (failure?.code === "ENOENT") return "未找到 Git，请安装 Git 后重新检查并同步";
  const details = `${failure?.stderr?.toString() ?? ""}\n${failure?.message ?? ""}`;
  if (/host key verification failed|remote host identification has changed/i.test(details)) return "SSH 主机身份尚未确认或已变化，请核对主机公钥后重新检查并同步";
  if (/permission denied.*publickey|no supported authentication methods|sign_and_send_pubkey.*failed/i.test(details)) return "SSH 身份验证失败，请确认平台已添加此电脑的公钥，并解锁 SSH 密钥后重试";
  if (/repository not found|does not appear to be a git repository|could not read from remote repository/i.test(details)) return "仓库无法访问，请检查仓库地址和此 SSH 密钥的访问权限";
  if (/protected branch|pre-receive hook declined|write access.*not granted|not allowed to push/i.test(details)) return "此分支不允许推送，请检查仓库写入权限或分支保护设置";
  if (/non-fast-forward|fetch first|stale info|failed to update ref/i.test(details)) return "远端在同步期间有新变更，本地内容已保留，请重新检查并同步";
  if (failure?.killed || /timed out|timeout|could not resolve hostname|connection refused|network is unreachable|connection reset|connection closed/i.test(details)) return "网络连接失败或超时，本地内容已保留，请恢复网络后重试";
  return "Git 操作失败，请检查 SSH、网络、分支权限或仓库状态后重试";
}
