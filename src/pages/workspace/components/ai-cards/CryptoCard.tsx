import { useLocale, getFormatLocale } from "@/i18n";
import { motion } from "motion/react";
import { ArrowDown, ArrowUp } from "@/components/ui/icons";
import type { CryptoCardData } from "@/lib/notebook-ai/cards/displayTypes";
import { rowVariants, useCountUp } from "./cardMotion";
import "./ai-cards-info.css";

type Coin = CryptoCardData["coins"][number];

/** CoinGecko id 形如 shiba-inu，展示为 Shiba Inu。 */
function coinName(id: string) {
  return id.split(/[-_\s]+/).filter(Boolean).map(word => word[0].toUpperCase() + word.slice(1)).join(" ");
}

/** 价格小数位随量级变化：低价币保留四位有效数字。 */
function formatPrice(value: number, currency: string) {
  const digits = value >= 1 ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumSignificantDigits: 4 };
  try {
    return new Intl.NumberFormat(getFormatLocale(), { style: "currency", currency, ...digits }).format(value);
  } catch {
    return `${new Intl.NumberFormat(getFormatLocale(), digits).format(value)} ${currency}`;
  }
}

function formatChange(value: number) {
  return `${Math.abs(value).toFixed(2)}%`;
}

function CoinRow({ coin, currency }: { coin: Coin; currency: string }) {
  const price = useCountUp(coin.price, { from: coin.price * 0.97 });
  const name = coinName(coin.id);
  const trend = coin.change24h > 0.005 ? "up" : coin.change24h < -0.005 ? "down" : "flat";
  const Arrow = trend === "down" ? ArrowDown : ArrowUp;
  return <motion.li className="ai-coin" variants={rowVariants}>
    <span className="ai-coin-badge" aria-hidden="true">{name[0] ?? "?"}</span>
    <span className="ai-coin-name">{name}</span>
    <span className="ai-coin-price goose-tabular" aria-label={formatPrice(coin.price, currency)}>
      {Number.isFinite(coin.price) ? formatPrice(price, currency) : "—"}
    </span>
    <span className="ai-coin-change goose-tabular" data-trend={trend} aria-label={`${coin.change24h > 0 ? "+" : ""}${coin.change24h.toFixed(2)}%`}>
      {trend !== "flat" && <Arrow size={12} aria-hidden="true"/>}
      {formatChange(coin.change24h)}
    </span>
  </motion.li>;
}

export function CryptoCard({ card }: { card: CryptoCardData }) {
  useLocale();
  const currency = card.currency.toUpperCase();
  return <ul className="ai-coins">
    {card.coins.map(coin => <CoinRow key={coin.id} coin={coin} currency={currency}/>)}
  </ul>;
}
