import { useLocale, createTranslator, i18nYaml } from "@/i18n";
import { motion } from "motion/react";
import type { WebResultsCardData } from "@/lib/notebook-ai/cards/types";
import { rowVariants } from "./cardMotion";
import { domainOf, openExternalUrl } from "./webLinks";
import "./ai-cards.css";

const messages = i18nYaml<"src/pages/workspace/components/ai-cards/WebResultsCard.tsx#messages:1">`
zh-Hans:
  webSources: "网页来源"
  openLink: "打开 {{domain}}"
en:
  webSources: "Web sources"
  openLink: "Open {{domain}}"
ja:
  webSources: "Web ソース"
  openLink: "{{domain}} を開く"
`;
const t = createTranslator(messages);

export function WebResultLink({ result, index }: { result: WebResultsCardData["results"][number]; index?: number }) {
  const domain = domainOf(result.url);
  return <motion.li variants={rowVariants}>
    <a className="ai-card-web-link" href={result.url} title={t("openLink", { domain })}
      onClick={event => { event.preventDefault(); openExternalUrl(result.url); }}>
      <span className="ai-card-web-badge" aria-hidden="true">{index ?? domain.charAt(0).toUpperCase()}</span>
      <span className="ai-card-web-text">
        <span className="ai-card-web-title">{result.title || domain}</span>
        <span className="ai-card-web-meta"><span className="ai-card-web-domain">{domain}</span>{result.snippet ? ` · ${result.snippet}` : ""}</span>
      </span>
    </a>
  </motion.li>;
}

export function WebResultsCard({ card, limit = 5 }: { card: WebResultsCardData; limit?: number }) {
  useLocale();
  return <ul className="ai-card-web" aria-label={t("webSources")}>
    {card.results.slice(0, limit).map(result => <WebResultLink key={result.url} result={result}/>)}
  </ul>;
}
