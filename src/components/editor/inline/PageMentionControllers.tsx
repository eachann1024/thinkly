import type { BlockNoteEditor } from "@blocknote/core";
import { SuggestionMenuController, type FloatingUIOptions } from "@blocknote/react";
import { PageReferenceMenu } from "./PageReferenceMenu";
import type { SlashMenuItem } from "../core/blocknoteSlashItems";
import { shouldOpenPageMentionSuggestionMenu } from "../utils/slashMenuPolicy";
import { PAGE_MENTION_TRIGGERS } from "../utils/pageMentionQuery";

export function PageMentionControllers({ editor, getItems, floatingUIOptions }: {
  editor: BlockNoteEditor<any, any, any>;
  getItems: (query: string) => Promise<SlashMenuItem[]>;
  floatingUIOptions?: FloatingUIOptions;
}) {
  return <>{PAGE_MENTION_TRIGGERS.map((trigger) => (
    <SuggestionMenuController
      key={trigger}
      triggerCharacter={trigger}
      getItems={getItems}
      floatingUIOptions={floatingUIOptions}
      shouldOpen={(event) => shouldOpenPageMentionSuggestionMenu(event, editor)}
      suggestionMenuComponent={PageReferenceMenu as any}
      onItemClick={(item) => { if (item && "onItemClick" in item) (item as SlashMenuItem).onItemClick(); }}
    />
  ))}</>;
}
