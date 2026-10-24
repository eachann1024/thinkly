import { createTranslator, i18nYaml } from "@/i18n";
import { Cloud, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSnow, CloudSun, Moon, Sun, type GooseIcon } from "@/components/ui/icons";

const messages = i18nYaml<"src/pages/workspace/components/ai-cards/weatherCodes.ts#messages:1">`
zh-Hans:
  clear: "晴"
  mainlyClear: "晴间少云"
  partlyCloudy: "多云"
  overcast: "阴"
  fog: "雾"
  drizzle: "毛毛雨"
  freezingDrizzle: "冻毛毛雨"
  lightRain: "小雨"
  rain: "中雨"
  heavyRain: "大雨"
  freezingRain: "冻雨"
  lightSnow: "小雪"
  snow: "中雪"
  heavySnow: "大雪"
  snowGrains: "米雪"
  showers: "阵雨"
  heavyShowers: "强阵雨"
  snowShowers: "阵雪"
  thunderstorm: "雷阵雨"
  hail: "雷阵雨伴冰雹"
  unknown: "未知天气"
en:
  clear: "Clear"
  mainlyClear: "Mostly clear"
  partlyCloudy: "Partly cloudy"
  overcast: "Overcast"
  fog: "Fog"
  drizzle: "Drizzle"
  freezingDrizzle: "Freezing drizzle"
  lightRain: "Light rain"
  rain: "Rain"
  heavyRain: "Heavy rain"
  freezingRain: "Freezing rain"
  lightSnow: "Light snow"
  snow: "Snow"
  heavySnow: "Heavy snow"
  snowGrains: "Snow grains"
  showers: "Showers"
  heavyShowers: "Heavy showers"
  snowShowers: "Snow showers"
  thunderstorm: "Thunderstorm"
  hail: "Thunderstorm with hail"
  unknown: "Unknown"
ja:
  clear: "晴れ"
  mainlyClear: "おおむね晴れ"
  partlyCloudy: "薄曇り"
  overcast: "曇り"
  fog: "霧"
  drizzle: "霧雨"
  freezingDrizzle: "着氷性の霧雨"
  lightRain: "小雨"
  rain: "雨"
  heavyRain: "大雨"
  freezingRain: "着氷性の雨"
  lightSnow: "小雪"
  snow: "雪"
  heavySnow: "大雪"
  snowGrains: "霧雪"
  showers: "にわか雨"
  heavyShowers: "激しいにわか雨"
  snowShowers: "にわか雪"
  thunderstorm: "雷雨"
  hail: "雷雨(ひょうを伴う)"
  unknown: "不明な天気"
`;
const t = createTranslator(messages);

export type WeatherTone = "clear" | "cloudy" | "fog" | "rain" | "snow" | "storm";
type LabelKey = Parameters<typeof t>[0];
type CodeInfo = { label: LabelKey; tone: WeatherTone };

const CODES: Record<number, CodeInfo> = {
  0: { label: "clear", tone: "clear" },
  1: { label: "mainlyClear", tone: "clear" },
  2: { label: "partlyCloudy", tone: "cloudy" },
  3: { label: "overcast", tone: "cloudy" },
  45: { label: "fog", tone: "fog" },
  48: { label: "fog", tone: "fog" },
  51: { label: "drizzle", tone: "rain" },
  53: { label: "drizzle", tone: "rain" },
  55: { label: "drizzle", tone: "rain" },
  56: { label: "freezingDrizzle", tone: "rain" },
  57: { label: "freezingDrizzle", tone: "rain" },
  61: { label: "lightRain", tone: "rain" },
  63: { label: "rain", tone: "rain" },
  65: { label: "heavyRain", tone: "rain" },
  66: { label: "freezingRain", tone: "rain" },
  67: { label: "freezingRain", tone: "rain" },
  71: { label: "lightSnow", tone: "snow" },
  73: { label: "snow", tone: "snow" },
  75: { label: "heavySnow", tone: "snow" },
  77: { label: "snowGrains", tone: "snow" },
  80: { label: "showers", tone: "rain" },
  81: { label: "showers", tone: "rain" },
  82: { label: "heavyShowers", tone: "rain" },
  85: { label: "snowShowers", tone: "snow" },
  86: { label: "snowShowers", tone: "snow" },
  95: { label: "thunderstorm", tone: "storm" },
  96: { label: "hail", tone: "storm" },
  99: { label: "hail", tone: "storm" },
};

export function describeWeather(code: number, isDay = true): { label: string; tone: WeatherTone; Icon: GooseIcon } {
  const info = CODES[code];
  if (!info) return { label: t("unknown"), tone: "cloudy", Icon: Cloud };
  return { label: t(info.label), tone: info.tone, Icon: weatherIcon(code, isDay) };
}

function weatherIcon(code: number, isDay: boolean): GooseIcon {
  if (code === 0) return isDay ? Sun : Moon;
  if (code === 1 || code === 2) return isDay ? CloudSun : CloudMoon;
  if (code === 3) return Cloud;
  if (code === 45 || code === 48) return CloudFog;
  if (code >= 95) return CloudLightning;
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return CloudSnow;
  return CloudRain;
}
