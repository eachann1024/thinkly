export function looksLikeBlockStructure(
  plainText: string,
  htmlText: string,
): boolean {
  const html = (htmlText || "").trim();
  if (html) {
    if (
      /<\s*(img|figure|picture|table|thead|tbody|tr|td|th|pre|ul|ol|li|h[1-6]|blockquote|hr|video|audio|iframe)\b/i.test(
        html,
      )
    ) {
      return true;
    }
    const blockParaCount = (html.match(/<\s*(p|div)\b/gi) || []).length;
    if (blockParaCount >= 2) return true;
  }

  const text = (plainText || "").trim();
  if (!text) return false;
  if (/\n/.test(text)) return true;
  if (
    /^(#{1,6}\s|\s*[-*+]\s|\s*\d+\.\s|\s*[-*+]\s\[[ xX]\]\s|>\s|```|\|.+\||-{3,}$)/.test(
      text,
    )
  ) {
    return true;
  }
  return false;
}

export function isValidUrl(text: string): boolean {
  if (!text) return false;
  if (/^[a-z][a-z0-9+.-]*:\/\/\S+/i.test(text)) return true;
  if (/^www\.\S+\.\S{2,}/i.test(text)) return true;
  if (
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(\/\S*)?$/i.test(
      text,
    ) &&
    isLinkworthyText(text)
  ) {
    return true;
  }
  return false;
}


const BARE_DOMAIN_TLDS = new Set([
  "com",
  "net",
  "org",
  "io",
  "dev",
  "ai",
  "cn",
  "co",
  "me",
  "edu",
  "gov",
  "mil",
  "info",
  "biz",
  "tv",
  "im",
  "ly",
  "to",
  "us",
  "uk",
  "jp",
  "de",
  "fr",
  "ru",
  "br",
  "in",
  "kr",
  "hk",
  "tw",
  "sg",
  "au",
  "ca",
  "it",
  "es",
  "nl",
  "se",
  "ch",
  "at",
  "fi",
  "no",
  "dk",
  "cz",
  "pt",
  "tr",
  "mx",
  "id",
  "th",
  "vn",
  "my",
  "ph",
  "nz",
  "za",
  "eu",
  "xyz",
  "top",
  "site",
  "online",
  "store",
  "tech",
  "fun",
  "live",
  "news",
  "work",
  "world",
  "zone",
  "cloud",
  "club",
  "space",
  "vip",
  "pro",
  "link",
  "run",
  "mobi",
  "name",
  "asia",
  "fm",
  "am",
  "gg",
  "wiki",
  "blog",
  "email",
  "design",
  "page",
  "one",
  "icu",
  "ren",
  "wang",
  "la",
  "moe",
]);

const HAS_URI_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const ALLOWED_LINK_SCHEMES = /^(https?|ftps?|mailto|tel|callto|sms|cid|xmpp):/i;

function gooseDataAttrHasNonDefaultValue(
  html: string,
  attrName: string,
  defaultValues: string[],
): boolean {
  const escaped = attrName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`${escaped}\\s*=\\s*(["'])([^"']*)\\1`, "gi");
  const defaults = new Set(defaultValues.map((v) => v.toLowerCase()));
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const value = match[2].trim().toLowerCase();
    if (!defaults.has(value)) return true;
  }
  return false;
}

export function htmlHasNonDefaultGooseBlockAttrs(htmlText: string): boolean {
  const html = (htmlText || "").trim();
  if (!html) return false;
  if (
    gooseDataAttrHasNonDefaultValue(html, "data-background-color", ["default"])
  ) {
    return true;
  }
  if (gooseDataAttrHasNonDefaultValue(html, "data-text-color", ["default"])) {
    return true;
  }
  if (
    gooseDataAttrHasNonDefaultValue(html, "data-text-alignment", [
      "default",
      "left",
    ])
  ) {
    return true;
  }
  return false;
}

export function htmlHasPreservableFormatting(htmlText: string): boolean {
  const html = (htmlText || "").trim();
  if (!html) return false;
  if (/<\s*(strong|b|em|i|u|s|del|code|a|span|mark)\b/i.test(html)) {
    return true;
  }
  if (/data-background-color|data-text-color|data-text-alignment/i.test(html)) {
    return true;
  }
  if (/style\s*=[^>]*(?:\bcolor\b|\bbackground\b)/i.test(html)) {
    return true;
  }
  if (/<\s*h[1-6]\b/i.test(html)) {
    return true;
  }
  if (/<\s*blockquote\b/i.test(html)) {
    return true;
  }
  return false;
}

export function isLinkworthyText(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (HAS_URI_SCHEME.test(v)) return ALLOWED_LINK_SCHEMES.test(v);
  if (/^www\./i.test(v)) return true;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return true;
  const host = v.split(/[/?#]/)[0];
  if (host !== host.toLowerCase()) return false;
  const tld = host.split(".").pop() ?? "";
  return BARE_DOMAIN_TLDS.has(tld);
}
