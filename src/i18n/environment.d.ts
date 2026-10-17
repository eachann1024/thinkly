import type { LanguageBridge } from "./contract";
declare global {
  interface Window { readonly gooseLanguage?: LanguageBridge }
}
export {};
