import { t } from "./i18n/gitErrors";
export function gitFailureMessage(error: unknown): string {
  const failure = error as { code?: string; killed?: boolean; stderr?: Buffer | string; message?: string };
  if (failure?.code === "ENOENT") return t("gitMissing");
  const details = `${failure?.stderr?.toString() ?? ""}\n${failure?.message ?? ""}`;
  if (/host key verification failed|remote host identification has changed/i.test(details)) return t("hostKey");
  if (/permission denied.*publickey|no supported authentication methods|sign_and_send_pubkey.*failed/i.test(details)) return t("sshAuth");
  if (/repository not found|does not appear to be a git repository|could not read from remote repository/i.test(details)) return t("repoAccess");
  if (/protected branch|pre-receive hook declined|write access.*not granted|not allowed to push/i.test(details)) return t("pushPermission");
  if (/non-fast-forward|fetch first|stale info|failed to update ref/i.test(details)) return t("remoteChanged");
  if (failure?.killed || /timed out|timeout|could not resolve hostname|connection refused|network is unreachable|connection reset|connection closed/i.test(details)) return t("network");
  return t("gitFailed");
}
