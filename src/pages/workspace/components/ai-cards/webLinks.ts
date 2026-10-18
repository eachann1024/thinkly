export function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** 桌面端交给系统浏览器；浏览器预览环境回退到新窗口。 */
export function openExternalUrl(url: string) {
  if (!/^https?:\/\//i.test(url)) return;
  if (window.gooseDesktop?.openUrl) void window.gooseDesktop.openUrl(url);
  else window.open(url, "_blank", "noopener,noreferrer");
}
