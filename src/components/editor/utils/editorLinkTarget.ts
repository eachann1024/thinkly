import { isLinkworthyText } from "./clipboardPolicy";

export type EditorLinkTarget =
  | { kind: "external"; url: string }
  | { kind: "anchor"; fragment: string }
  | { kind: "local"; path: string; fragment: string }
  | { kind: "invalid" };

function fileUrl(path: string): URL {
  const normalized = path.replace(/\\/g, "/");
  const encoded = normalized.split("/").map(encodeURIComponent).join("/")
    .replace(/^([a-z])%3A/i, "$1:");
  return new URL(normalized.startsWith("//") ? `file:${encoded}`
    : `file://${normalized.startsWith("/") ? "" : "/"}${encoded}`);
}

export function resolveEditorLink(url: string, pagePath?: string | null): EditorLinkTarget {
  const value = url.trim();
  if (!value || /[\u0000-\u001f\u007f]/.test(value)) return { kind: "invalid" };
  try {
    if (value.startsWith("#")) {
      return { kind: "anchor", fragment: decodeURIComponent(value.slice(1)) };
    }
    if (value.startsWith("//")) return { kind: "external", url: `https:${value}` };
    const windowsPath = /^[a-z]:[\\/]/i.test(value) || value.startsWith("\\\\");
    const fileScheme = /^file:/i.test(value);
    if (!windowsPath && !fileScheme && /^[a-z][a-z0-9+.-]*:/i.test(value)) {
      return isLinkworthyText(value) ? { kind: "external", url: value } : { kind: "invalid" };
    }
    if (!windowsPath && !fileScheme && isLinkworthyText(value)) {
      const external = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ? `mailto:${value}` : `https://${value}`;
      return { kind: "external", url: external };
    }
    const absolute = windowsPath || value.startsWith("/") || fileScheme;
    if (!pagePath && !absolute) return { kind: "invalid" };
    const base = pagePath ? fileUrl(pagePath) : new URL("file:///");
    const resolved = fileScheme ? new URL(value) : windowsPath
      ? new URL(value.replace(/\\/g, "/").replace(/^([a-z]):/i, "file:///$1:"), base)
      : new URL(value.replace(/\\/g, "/"), base);
    if (resolved.protocol !== "file:" || resolved.username || resolved.password) return { kind: "invalid" };
    let path = decodeURIComponent(resolved.pathname);
    if (/^\/[a-z]:\//i.test(path)) path = path.slice(1);
    if (resolved.host && resolved.host !== "localhost") path = `//${resolved.host}${path}`;
    return { kind: "local", path, fragment: decodeURIComponent(resolved.hash.slice(1)) };
  } catch {
    return { kind: "invalid" };
  }
}

export function isValidEditorLink(url: string): boolean {
  return resolveEditorLink(url, "/note.md").kind !== "invalid";
}
