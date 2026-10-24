export type MessageResource = Readonly<Record<string, string>>;
export type MessageParameters = Record<string, string | number>;
export type MessageSchema = Record<string, MessageParameters>;
export interface MessageCatalog {}
export type CompiledMessages<Schema extends MessageSchema = MessageSchema> = {
  readonly "zh-Hans": MessageResource;
  readonly en: MessageResource;
  readonly ja: MessageResource;
  readonly __schema?: Schema;
};
export type Translator<Schema extends MessageSchema = MessageSchema> = string extends keyof Schema
  ? (key: string, parameters?: MessageParameters) => string
  : <Key extends keyof Schema & string>(
  key: Key,
  ...args: keyof Schema[Key] extends never
    ? [parameters?: Schema[Key]]
    : [parameters: Schema[Key]]
) => string;
