export function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function openExternalUrl(url: string) {
  if (!/^https?:\/\//i.test(url)) return;
  if (window.gooseDesktop?.openUrl) void window.gooseDesktop.openUrl(url);
  else window.open(url, "_blank", "noopener,noreferrer");
}
