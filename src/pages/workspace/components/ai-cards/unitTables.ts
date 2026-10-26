import type { UnitConverterCardData } from "@/lib/notebook-ai/cards/types";

export type UnitCategory = UnitConverterCardData["category"];

export type UnitDef = { id: string; symbol: string; zh: string; en: string; ja: string; factor: number; aliases?: string[] };

const L = (id: string, symbol: string, zh: string, en: string, ja: string, factor: number, aliases: string[] = []): UnitDef =>
  ({ id, symbol, zh, en, ja, factor, aliases });

export const UNIT_TABLES: Record<UnitCategory, UnitDef[]> = {
  length: [
    L("m", "m", "米", "Meter", "メートル", 1, ["meter", "metre", "米"]),
    L("km", "km", "千米", "Kilometer", "キロメートル", 1000, ["kilometer", "千米", "公里"]),
    L("cm", "cm", "厘米", "Centimeter", "センチメートル", 0.01, ["centimeter", "厘米"]),
    L("mm", "mm", "毫米", "Millimeter", "ミリメートル", 0.001, ["millimeter", "毫米"]),
    L("mi", "mi", "英里", "Mile", "マイル", 1609.344, ["mile", "miles", "英里"]),
    L("ft", "ft", "英尺", "Foot", "フィート", 0.3048, ["foot", "feet", "英尺"]),
    L("in", "in", "英寸", "Inch", "インチ", 0.0254, ["inch", "inches", "英寸"]),
    L("yd", "yd", "码", "Yard", "ヤード", 0.9144, ["yard", "yards", "码"]),
    L("li", "里", "里", "Li", "里（中国）", 500, ["里", "华里"]),
    L("zhang", "丈", "丈", "Zhang", "丈（中国）", 10 / 3, ["丈"]),
    L("chi", "尺", "尺", "Chi", "尺（中国）", 1 / 3, ["尺", "市尺"]),
  ],
  weight: [
    L("kg", "kg", "千克", "Kilogram", "キログラム", 1, ["kilogram", "千克", "公斤"]),
    L("g", "g", "克", "Gram", "グラム", 0.001, ["gram", "克"]),
    L("mg", "mg", "毫克", "Milligram", "ミリグラム", 1e-6, ["milligram", "毫克"]),
    L("t", "t", "吨", "Tonne", "トン", 1000, ["ton", "tonne", "吨"]),
    L("lb", "lb", "磅", "Pound", "ポンド", 0.45359237, ["lbs", "pound", "pounds", "磅"]),
    L("oz", "oz", "盎司", "Ounce", "オンス", 0.028349523125, ["ounce", "ounces", "盎司"]),
    L("jin", "斤", "斤", "Jin", "斤（中国）", 0.5, ["斤", "市斤"]),
    L("liang", "两", "两", "Liang", "両（中国）", 0.05, ["两"]),
  ],
  temperature: [
    L("c", "°C", "摄氏度", "Celsius", "摂氏", 1, ["celsius", "°c", "℃", "摄氏度", "摄氏"]),
    L("f", "°F", "华氏度", "Fahrenheit", "華氏", 1, ["fahrenheit", "°f", "℉", "华氏度", "华氏"]),
    L("k", "K", "开尔文", "Kelvin", "ケルビン", 1, ["kelvin", "开尔文", "开"]),
  ],
  area: [
    L("m2", "m²", "平方米", "Square meter", "平方メートル", 1, ["m²", "sqm", "平方米", "平米"]),
    L("km2", "km²", "平方千米", "Square kilometer", "平方キロメートル", 1e6, ["km²", "平方千米", "平方公里"]),
    L("ha", "ha", "公顷", "Hectare", "ヘクタール", 1e4, ["hectare", "公顷"]),
    L("acre", "ac", "英亩", "Acre", "エーカー", 4046.8564224, ["acres", "ac", "英亩"]),
    L("ft2", "ft²", "平方英尺", "Square foot", "平方フィート", 0.09290304, ["ft²", "sqft", "平方英尺"]),
    L("mu", "亩", "亩", "Mu", "畝（中国）", 10000 / 15, ["亩", "市亩"]),
  ],
  volume: [
    L("l", "L", "升", "Liter", "リットル", 1, ["liter", "litre", "升"]),
    L("ml", "mL", "毫升", "Milliliter", "ミリリットル", 0.001, ["milliliter", "毫升"]),
    L("m3", "m³", "立方米", "Cubic meter", "立方メートル", 1000, ["m³", "立方米", "方"]),
    L("gal", "gal", "加仑", "US gallon", "米ガロン", 3.785411784, ["gallon", "gallons", "加仑"]),
    L("qt", "qt", "夸脱", "US quart", "米クォート", 0.946352946, ["quart", "quarts", "夸脱"]),
    L("cup", "cup", "杯", "US cup", "米カップ", 0.2365882365, ["cups", "杯"]),
  ],
  speed: [
    L("kmh", "km/h", "千米/时", "km/h", "キロメートル毎時", 1 / 3.6, ["km/h", "kph", "公里/小时", "千米/时"]),
    L("ms", "m/s", "米/秒", "m/s", "メートル毎秒", 1, ["m/s", "米/秒"]),
    L("mph", "mph", "英里/时", "mph", "マイル毎時", 0.44704, ["mi/h", "英里/小时", "英里/时"]),
    L("kn", "kn", "节", "Knot", "ノット", 1852 / 3600, ["knot", "knots", "kt", "节"]),
  ],
  data: [
    L("b", "B", "字节", "Byte", "バイト", 1, ["byte", "bytes", "字节"]),
    L("kb", "KB", "KB", "Kilobyte", "キロバイト", 1024, ["kib", "kilobyte"]),
    L("mb", "MB", "MB", "Megabyte", "メガバイト", 1024 ** 2, ["mib", "megabyte", "兆"]),
    L("gb", "GB", "GB", "Gigabyte", "ギガバイト", 1024 ** 3, ["gib", "gigabyte", "g"]),
    L("tb", "TB", "TB", "Terabyte", "テラバイト", 1024 ** 4, ["tib", "terabyte", "t"]),
  ],
  time: [
    L("s", "s", "秒", "Second", "秒", 1, ["sec", "second", "seconds", "秒"]),
    L("min", "min", "分钟", "Minute", "分", 60, ["minute", "minutes", "分", "分钟"]),
    L("h", "h", "小时", "Hour", "時間", 3600, ["hr", "hour", "hours", "时", "小时"]),
    L("d", "d", "天", "Day", "日", 86400, ["day", "days", "天", "日"]),
    L("wk", "wk", "周", "Week", "週", 604800, ["w", "week", "weeks", "周", "星期"]),
  ],
};

export function resolveUnit(category: UnitCategory, raw: string): UnitDef {
  const units = UNIT_TABLES[category] ?? UNIT_TABLES.length;
  const key = raw.trim().toLowerCase();
  return units.find(u => u.id === key)
    ?? units.find(u => u.symbol.toLowerCase() === key || u.aliases?.some(a => a.toLowerCase() === key))
    ?? units[0];
}

function toCelsius(value: number, id: string) {
  if (id === "f") return (value - 32) * 5 / 9;
  if (id === "k") return value - 273.15;
  return value;
}

function fromCelsius(value: number, id: string) {
  if (id === "f") return value * 9 / 5 + 32;
  if (id === "k") return value + 273.15;
  return value;
}

export function convertUnit(category: UnitCategory, value: number, from: UnitDef, to: UnitDef): number {
  if (category === "temperature") return fromCelsius(toCelsius(value, from.id), to.id);
  return (value * from.factor) / to.factor;
}
