import { EditorAction } from "@/components/editor/ui/button";
import { type ComponentType, type RefObject } from "react";
import { createPortal } from "react-dom";
import { FoldVertical, Plus, WandSparkles } from "@/components/ui/icons";
import {
  slashItemDescription,
  slashItemKey,
  slashItemTitle,
  type ComposerSlashItem,
} from "@/lib/notebook-ai/composerSlashCommands";
import { useCenteredActiveItemScroll } from "@/components/editor/hooks/useCenteredActiveItemScroll";
import { cn } from "@/lib/utils";
import { useComposerSuggestionsPosition } from "./useComposerSuggestionsPosition";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/ai/composer/SkillSuggestionsList.tsx#messages:1">`
zh-Hans:
  noMatchingCommandsOrSkills: "没有匹配的指令或 Skill"
en:
  noMatchingCommandsOrSkills: "No matching commands or skills"
`;
const t = createTranslator(messages);


const getSkillItemSelector = (index: number) => `[data-skill-index="${index}"]`;

function SlashItemIcon({ item }: { item: ComposerSlashItem }) {
  useLocale();
  const Icon: ComponentType<{ className?: string }> =
    item.kind === "skill"
      ? WandSparkles
      : item.id === "new"
        ? Plus
        : FoldVertical;
  return <Icon className="h-3.5 w-3.5 text-muted-foreground" />;
}

export function SkillSuggestionsList(props: {
  items: ComposerSlashItem[];
  activeIndex: number;
  listKey?: string;
  anchorRect: DOMRect;
  composerRef: RefObject<HTMLDivElement | null>;
  onSelect: (item: ComposerSlashItem) => void;
}) {
  useLocale();
  const { floatingRef, style, maxWidth, maxHeight } = useComposerSuggestionsPosition(
    props.composerRef,
    props.anchorRect,
    "/",
  );
  const listRef = useCenteredActiveItemScroll<HTMLDivElement>({
    activeIndex: props.activeIndex,
    itemCount: props.items.length,
    listKey: props.listKey,
    itemSelector: getSkillItemSelector,
  });

  return createPortal(
    <div
      ref={floatingRef}
      data-ai-composer-suggestions="command"
      style={style}
      onMouseDown={(event) => event.preventDefault()}
    >
      <div
        ref={listRef}
        data-goose-menu-slot="root"
        className="goose-menu-surface goose-list-layout w-[340px] overflow-y-auto p-1.5"
        style={{ maxWidth, maxHeight }}
      >
        {props.items.length === 0 ? (
          <div className="px-3 py-2 text-[12px] text-muted-foreground">
            {t("noMatchingCommandsOrSkills")}
          </div>
        ) : (
          props.items.map((item, index) => {
            const description = slashItemDescription(item);
            return (
              <EditorAction
                key={slashItemKey(item)}
                type="button"
                data-skill-index={index}
                data-goose-menu-slot="row"
                data-keyboard-active={index === props.activeIndex || undefined}
                className={cn(
                  // items-start：多行描述时图标与标题首行并排，首行通过等高容器绝对居中
                  "goose-menu-item goose-menu-item-multiline goose-list-row flex w-full flex-nowrap items-start gap-2 rounded-md px-2.5 py-1.5 text-left",
                )}
                onMouseDown={(event) => {
                  event.preventDefault();
                  props.onSelect(item);
                }}
              >
                <span className="flex h-[20px] w-4 shrink-0 items-center justify-center">
                  <SlashItemIcon item={item} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col justify-start gap-0.5">
                  <span className="block truncate goose-menu-title">
                    {slashItemTitle(item)}
                  </span>
                  {description ? (
                    <span className="line-clamp-2 goose-menu-description">
                      {description}
                    </span>
                  ) : null}
                </span>
              </EditorAction>
            );
          })
        )}
      </div>
    </div>,
    document.body,
  );
}
