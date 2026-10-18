import { useLocale, getFormatLocale, createTranslator, i18nYaml } from "@/i18n";
import { motion } from "motion/react";
import { Droplet, Thermometer, Wind } from "@/components/ui/icons";
import type { WeatherCardData, WeatherDay } from "@/lib/notebook-ai/cards/types";
import { rowVariants, useCountUp } from "./cardMotion";
import { describeWeather } from "./weatherCodes";

const messages = i18nYaml<"src/pages/workspace/components/ai-cards/WeatherCard.tsx#messages:1">`
zh-Hans:
  feelsLike: "体感 {{value}}"
  humidity: "湿度 {{value}}%"
  wind: "风速 {{value}}"
  today: "今天"
  rainChance: "降水 {{value}}%"
  forecast: "未来天气"
en:
  feelsLike: "Feels like {{value}}"
  humidity: "Humidity {{value}}%"
  wind: "Wind {{value}}"
  today: "Today"
  rainChance: "Rain {{value}}%"
  forecast: "Forecast"
ja:
  feelsLike: "体感 {{value}}"
  humidity: "湿度 {{value}}%"
  wind: "風速 {{value}}"
  today: "今日"
  rainChance: "降水 {{value}}%"
  forecast: "予報"
`;
const t = createTranslator(messages);

const round = (value: number) => Math.round(value);

function placeName(location: WeatherCardData["location"]) {
  return [location.name, location.region && location.region !== location.name ? location.region : "", location.country]
    .filter(Boolean).join(" · ");
}

function weekday(day: WeatherDay, index: number) {
  if (index === 0) return t("today");
  // 日期按地点当地日历解析，取正午避免跨时区回退到前一天。
  const date = new Date(`${day.date}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? day.date : new Intl.DateTimeFormat(getFormatLocale(), { weekday: "short", timeZone: "UTC" }).format(date);
}

function ForecastRow({ day, index, low, high }: { day: WeatherDay; index: number; low: number; high: number }) {
  const { Icon, label } = describeWeather(day.weatherCode, true);
  const span = Math.max(1, high - low);
  const left = ((day.min - low) / span) * 100;
  const width = Math.max(6, ((day.max - day.min) / span) * 100);
  return <motion.li className="ai-card-forecast-row" variants={rowVariants}>
    <span className="ai-card-forecast-day">{weekday(day, index)}</span>
    <span className="ai-card-forecast-icon" title={label}><Icon size={16} aria-label={label}/></span>
    <span className="ai-card-forecast-rain goose-tabular">
      {day.precipitationProbability != null && day.precipitationProbability >= 20 ? t("rainChance", { value: day.precipitationProbability }) : ""}
    </span>
    <span className="ai-card-forecast-min goose-tabular">{round(day.min)}°</span>
    <span className="ai-card-range" aria-hidden="true">
      <motion.span className="ai-card-range-fill" style={{ left: `${left}%`, width: `${width}%`, originX: 0 }}
        variants={{ hidden: { scaleX: 0 }, shown: { scaleX: 1, transition: { type: "spring", stiffness: 260, damping: 32 } } }}/>
    </span>
    <span className="ai-card-forecast-max goose-tabular">{round(day.max)}°</span>
  </motion.li>;
}

export function WeatherCard({ card }: { card: WeatherCardData }) {
  useLocale();
  const { current, daily, units } = card;
  const { Icon, label, tone } = describeWeather(current.weatherCode, current.isDay);
  const temperature = useCountUp(current.temperature);
  const low = Math.min(...daily.map(d => d.min));
  const high = Math.max(...daily.map(d => d.max));
  const unit = units.temperature || "°C";
  return <div className="ai-card-weather" data-tone={tone} data-night={!current.isDay || undefined}>
    <motion.div className="ai-card-weather-now" variants={rowVariants}>
      <div className="ai-card-weather-main">
        <span className="ai-card-place">{placeName(card.location)}</span>
        <span className="ai-card-weather-temp goose-tabular">{round(temperature)}<span className="ai-card-weather-unit">{unit}</span></span>
        <span className="ai-card-weather-cond">{label}</span>
      </div>
      <Icon className="ai-card-weather-glyph" size={44} aria-hidden="true"/>
    </motion.div>
    <motion.div className="ai-card-weather-meta goose-tabular" variants={rowVariants}>
      <span><Thermometer size={14} aria-hidden="true"/>{t("feelsLike", { value: `${round(current.apparentTemperature)}°` })}</span>
      <span><Droplet size={14} aria-hidden="true"/>{t("humidity", { value: round(current.humidity) })}</span>
      <span><Wind size={14} aria-hidden="true"/>{t("wind", { value: `${round(current.windSpeed)} ${units.windSpeed}` })}</span>
    </motion.div>
    {daily.length > 0 && <ul className="ai-card-forecast" aria-label={t("forecast")}>
      {daily.map((day, index) => <ForecastRow key={day.date} day={day} index={index} low={low} high={high}/>)}
    </ul>}
  </div>;
}
