import { createTranslator, type CompiledMessages, type MessageSchema, type Translator } from "../../../src/i18n/core";

const displayedMessages = new Set<string>();
export function isDesktopMessage(message: string): boolean {
  return displayedMessages.has(message);
}
export function createDesktopTranslator<Schema extends MessageSchema>(messages: CompiledMessages<Schema>): Translator<Schema> {
  const translate = createTranslator(messages) as (key: string, parameters?: Record<string, string | number>) => string;
  return ((key: string, parameters?: Record<string, string | number>) => {
    const text = translate(key, parameters);
    displayedMessages.add(text);
    if (displayedMessages.size > 2048) displayedMessages.delete(displayedMessages.values().next().value!);
    return text;
  }) as Translator<Schema>;
}
