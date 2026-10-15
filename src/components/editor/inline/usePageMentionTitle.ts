import { useCallback, useSyncExternalStore } from "react";
import { useEditorPageContext } from "../platform/hostContext";
import type { PageMentionProps } from "./pageMention";

const noSubscription = () => () => {};

export function usePageMentionTitle(props: PageMentionProps) {
  const { resolvePageMention, subscribePageMetadata } = useEditorPageContext();
  const getSnapshot = useCallback(() => {
    const live = resolvePageMention?.(props);
    return JSON.stringify(live ?? { title: props.title, notebookName: props.notebookName });
  }, [resolvePageMention, props.pageId, props.workspaceId, props.wikiTarget, props.title, props.notebookName]);
  const value = useSyncExternalStore(subscribePageMetadata ?? noSubscription, getSnapshot, getSnapshot);
  return JSON.parse(value) as { title: string; notebookName: string };
}
