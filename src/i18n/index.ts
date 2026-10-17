import { useMemo, useSyncExternalStore } from "react";
import { createTranslator, getLocale, subscribeLanguage } from "./runtime";
import type { CompiledMessages, MessageSchema } from "./types";
export * from "./core";

export function useLocale() {
  return useSyncExternalStore(subscribeLanguage, getLocale, getLocale);
}

export function useMessages<Schema extends MessageSchema>(messages: CompiledMessages<Schema>) {
  const locale = useLocale();
  return useMemo(() => createTranslator(messages), [messages, locale]);
}
