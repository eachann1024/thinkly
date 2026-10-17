import { useMemo, useSyncExternalStore } from "react";
import { createTranslator, getLanguageSnapshot, subscribeLanguage } from "./runtime";
import type { CompiledMessages, MessageSchema } from "./types";
export * from "./core";

export function useMessages<Schema extends MessageSchema>(messages: CompiledMessages<Schema>) {
  useSyncExternalStore(subscribeLanguage, getLanguageSnapshot, getLanguageSnapshot);
  return useMemo(() => createTranslator(messages), [messages]);
}
