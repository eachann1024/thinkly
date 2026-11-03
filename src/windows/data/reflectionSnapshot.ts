import type { AISettingsLike } from "@/lib/ai-provider";
import type { ReflectionReport } from "@/stores/useReflection";
import type { Page } from "@/types";

export interface ReflectionSnapshot {
  reports: Record<string, ReflectionReport>;
  aiConsent: boolean;
  aiConsentChosen: boolean;
  generatingKey: string | null;
  failure: { key: string; message: string } | null;
}

/** The `pages` snapshot is the live page map itself, not wrapped. */
export type ReflectionPage = Pick<Page, "content" | "localFilePath" | "isFolder" | "trashedAt" | "editorDraft" | "localReadState" | "id">;

export interface ReflectionSettingsSnapshot {
  ai: AISettingsLike;
}
