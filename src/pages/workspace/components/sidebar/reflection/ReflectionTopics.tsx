import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";
import type { ReflectionTopic } from "@/lib/reflection/generateReflection";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/reflection/ReflectionTopics.tsx#localMessages:1">`
zh-Hans:
  topics: "主题分布"
en:
  topics: "Topics"
`;
const uiText = createTranslator(localMessages);

/** 主题色：主题强调色的不同浓度，随浅色/深色主题变化。 */
const TOPIC_OPACITY = [100, 78, 58, 42, 30, 20];
const topicColor = (i: number) =>
  `color-mix(in srgb, var(--goose-accent-solid) ${TOPIC_OPACITY[i % TOPIC_OPACITY.length]}%, transparent)`;

export function ReflectionTopics({ topics }: { topics: ReflectionTopic[] }) {
  useLocale();
  if (topics.length === 0) return null;
  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-foreground">{uiText("topics")}</h3>
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label={uiText("topics")}>
        {topics.map((topic, i) => (
          <span key={topic.name} style={{ width: `${topic.share}%`, backgroundColor: topicColor(i) }} />
        ))}
      </div>
      <ul className="mt-4 space-y-3">
        {topics.map((topic, i) => (
          <li key={topic.name} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: topicColor(i) }}
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground">{topic.name}</div>
              {topic.description ? <div className="text-sm text-muted-foreground">{topic.description}</div> : null}
            </div>
            <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{topic.share}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
