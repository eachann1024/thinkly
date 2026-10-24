import { tool } from "ai";
import { z } from "zod";
import type { ExchangeCardData, WeatherCardData, WorldTimeCardData } from "../cards/types";
import { fetchPublicJson } from "./builtinWeb";
import { errorMessage } from "./webTransport";

type GeoHit = { name: string; latitude: number; longitude: number; country?: string; admin1?: string; timezone?: string };

async function geocode(location: string, signal?: AbortSignal): Promise<GeoHit | null> {
  for (const language of ["zh", "en"]) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=${language}&format=json`;
    const data = (await fetchPublicJson(url, signal)) as { results?: GeoHit[] };
    if (data.results?.[0]) return data.results[0];
  }
  return null;
}

export const getWeather = tool({
  description: "查询某地的实时天气和未来 7 天预报，结果会以天气卡片展示给用户。用户问天气、气温、要不要带伞时调用。",
  inputSchema: z.object({
    location: z.string().min(1).describe("城市或地区名，如 北京、上海浦东、Tokyo"),
  }),
  execute: async (input, options): Promise<WeatherCardData | { error: string }> => {
    try {
      const place = await geocode(input.location.trim(), options.abortSignal);
      if (!place) return { error: `没找到「${input.location}」这个地点` };
      const params = new URLSearchParams({
        latitude: String(place.latitude),
        longitude: String(place.longitude),
        current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day",
        daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
        timezone: "auto",
        forecast_days: "7",
      });
      const data = (await fetchPublicJson(`https://api.open-meteo.com/v1/forecast?${params}`, options.abortSignal)) as {
        timezone?: string;
        current?: Record<string, number>;
        current_units?: Record<string, string>;
        daily?: Record<string, Array<number | string | null>>;
      };
      const current = data.current ?? {};
      const daily = data.daily ?? {};
      const days = (daily.time ?? []).map((date, i) => ({
        date: String(date),
        weatherCode: Number(daily.weather_code?.[i] ?? 0),
        max: Number(daily.temperature_2m_max?.[i] ?? 0),
        min: Number(daily.temperature_2m_min?.[i] ?? 0),
        precipitationProbability: daily.precipitation_probability_max?.[i] == null ? null : Number(daily.precipitation_probability_max[i]),
      }));
      return {
        kind: "weather",
        location: { name: place.name, region: place.admin1, country: place.country, timezone: data.timezone ?? place.timezone ?? "UTC" },
        current: {
          temperature: Number(current.temperature_2m ?? 0),
          apparentTemperature: Number(current.apparent_temperature ?? 0),
          humidity: Number(current.relative_humidity_2m ?? 0),
          windSpeed: Number(current.wind_speed_10m ?? 0),
          weatherCode: Number(current.weather_code ?? 0),
          isDay: current.is_day !== 0,
        },
        daily: days,
        units: { temperature: data.current_units?.temperature_2m ?? "°C", windSpeed: data.current_units?.wind_speed_10m ?? "km/h" },
        source: "Open-Meteo",
        fetchedAt: new Date().toISOString(),
      };
    } catch (error) {
      return { error: errorMessage(error) };
    }
  },
});

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function frankfurterRate(base: string, quote: string, signal?: AbortSignal) {
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 86_400_000);
  const url = `https://api.frankfurter.app/${isoDate(start)}..${isoDate(end)}?from=${base}&to=${quote}`;
  const data = (await fetchPublicJson(url, signal)) as { rates?: Record<string, Record<string, number>> };
  const history = Object.entries(data.rates ?? {})
    .map(([date, rates]) => ({ date, rate: Number(rates[quote]) }))
    .filter((item) => Number.isFinite(item.rate))
    .sort((a, b) => a.date.localeCompare(b.date));
  const last = history.at(-1);
  return last ? { rate: last.rate, date: last.date, history, source: "Frankfurter (ECB)" } : null;
}

async function erApiRate(base: string, quote: string, signal?: AbortSignal) {
  const data = (await fetchPublicJson(`https://open.er-api.com/v6/latest/${base}`, signal)) as {
    result?: string; rates?: Record<string, number>; time_last_update_unix?: number;
  };
  const rate = data.rates?.[quote];
  if (data.result !== "success" || typeof rate !== "number") return null;
  const date = isoDate(new Date((data.time_last_update_unix ?? Date.now() / 1000) * 1000));
  return { rate, date, history: [], source: "ExchangeRate-API" };
}

export const getExchangeRate = tool({
  description: "查询两种货币的最新汇率并换算金额，结果会以汇率卡片展示。用户问汇率、外币换算时调用。币种用 ISO 代码，如 USD、CNY、JPY、EUR、HKD。",
  inputSchema: z.object({
    from: z.string().min(3).max(3).describe("源货币 ISO 代码"),
    to: z.string().min(3).max(3).describe("目标货币 ISO 代码"),
    amount: z.number().positive().optional().default(1).describe("换算金额，默认 1"),
  }),
  execute: async (input, options): Promise<ExchangeCardData | { error: string }> => {
    const base = input.from.toUpperCase();
    const quote = input.to.toUpperCase();
    try {
      const found =
        (await frankfurterRate(base, quote, options.abortSignal).catch(() => null)) ??
        (await erApiRate(base, quote, options.abortSignal));
      if (!found) return { error: `暂时查不到 ${base} → ${quote} 的汇率` };
      const amount = input.amount ?? 1;
      return { kind: "exchange", base, quote, amount, rate: found.rate, converted: Math.round(amount * found.rate * 10000) / 10000, date: found.date, history: found.history, source: found.source };
    } catch (error) {
      return { error: errorMessage(error) };
    }
  },
});

function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export const getWorldTime = tool({
  description: "显示一个或多个城市的当前时间和时差，结果会以时钟卡片展示。用户问几点了、时差、跨时区约时间时调用。",
  inputSchema: z.object({
    places: z
      .array(z.object({
        label: z.string().min(1).describe("显示名称，如 纽约"),
        timeZone: z.string().min(1).describe("IANA 时区，如 America/New_York、Asia/Shanghai"),
      }))
      .min(1)
      .max(6),
  }),
  execute: async (input): Promise<WorldTimeCardData | { error: string }> => {
    const entries = input.places.filter((place) => isValidTimeZone(place.timeZone));
    if (entries.length === 0) return { error: "没有可识别的时区" };
    return { kind: "worldTime", entries };
  },
});

export const getCryptoPrice = tool({
  description: "查询加密货币的实时价格和 24 小时涨跌，结果以行情卡片展示。用户问比特币、以太坊等币价时使用。",
  inputSchema: z.object({
    coins: z.array(z.string().min(1)).min(1).max(5).describe("CoinGecko 币种 id，如 bitcoin、ethereum、solana、dogecoin"),
    currency: z.string().optional().default("usd").describe("计价货币，如 usd、cny"),
  }),
  execute: async (input, options) => {
    const vs = (input.currency ?? "usd").toLowerCase();
    try {
      const ids = input.coins.map((coin) => coin.trim().toLowerCase()).join(",");
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=${vs}&include_24hr_change=true`;
      const data = (await fetchPublicJson(url, options.abortSignal)) as Record<string, Record<string, number>>;
      const coins = Object.entries(data).map(([id, row]) => ({ id, price: Number(row[vs]), change24h: Number(row[`${vs}_24h_change`] ?? 0) }));
      if (coins.length === 0) return { error: "没有查到这些币种" };
      return { kind: "crypto" as const, currency: vs.toUpperCase(), coins, source: "CoinGecko", fetchedAt: new Date().toISOString() };
    } catch (error) {
      return { error: errorMessage(error) };
    }
  },
});
