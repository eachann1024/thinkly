export const DEFAULT_CALLOUT_ICON = "Lightbulb";

export const LUCIDE_ICON_TO_EMOJI: Record<string, string> = {
  Lightbulb: "💡",
  AlertTriangle: "⚠️",
  CircleAlert: "❗",
  CircleCheck: "✅",
  Flame: "🔥",
  Pin: "📌",
  MessageSquare: "💬",
  Target: "🎯",
  Rocket: "🚀",
  Star: "⭐",
  Bell: "🔔",
  Bug: "🐛",
};

const EMOJI_TO_LUCIDE_ICON: Record<string, string> = Object.fromEntries(
  Object.entries(LUCIDE_ICON_TO_EMOJI).map(([name, emoji]) => [emoji, name]),
);

const LUCIDE_ICON_NAME_RE = /^[A-Z][A-Za-z0-9]*$/;

export function normalizeCalloutIcon(iconStr?: string): string {
  const raw = (iconStr || DEFAULT_CALLOUT_ICON).trim();
  if (!raw) return DEFAULT_CALLOUT_ICON;
  if (LUCIDE_ICON_NAME_RE.test(raw)) return raw;
  return EMOJI_TO_LUCIDE_ICON[raw] ?? raw;
}

export function resolveCalloutIcon(raw?: string): string {
  if (!raw) return LUCIDE_ICON_TO_EMOJI[DEFAULT_CALLOUT_ICON];
  return LUCIDE_ICON_TO_EMOJI[raw] ?? raw;
}
