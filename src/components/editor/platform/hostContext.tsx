import { createContext, useContext, type ReactNode } from "react";
import type { Page } from "@/types";
import type { BlockNoteContent } from "@/components/editor/utils/blocknote-content";
import type {
  AiReferenceSuggestionItem,
  AiFileReferenceAttrs,
  ResolvedAiReferenceContext,
} from "@/components/editor/ai/composer/referenceLookup";
import type { EditorPlatform } from "./types";
import type { OpenExternalResourceResult } from "@/components/editor/utils/openResourceExternally";
import type { PageMentionProps } from "../inline/pageMention";

export interface EditorFontConfig {
  label: string | null;
  font: string | null;
}

export interface EditorCustomFonts {
  default: EditorFontConfig;
  serif: EditorFontConfig;
  mono: EditorFontConfig;
}

export interface EditorAISettings {
  enabled: boolean;
  selectedModelId: string | null;
  workspaceSelectedModelId: string | null;
  workspaceReasoningLevel: "default" | "low" | "medium" | "high";
  customProviderId?: string | null;
  customProtocol: "openai-responses" | "openai" | "claude";
  customOpenAIResponsesBaseURL: string;
  customOpenAIBaseURL: string;
  customClaudeBaseURL: string;
  customOpenAIResponsesApiKey: string;
  customOpenAIApiKey: string;
  customClaudeApiKey: string;
  customModelOptions: Array<{
    id: string;
    label: string;
    description?: string;
  }>;
}

export interface EditorSearchProvider {
  id: string;
  name: string;
  urlTemplate: string;
  isEnabled: boolean;
}

export interface EditorCustomAction {
  id: string;
  name: string;
  pluginName?: string;
  command: string;
  isEnabled: boolean;
}

export interface EditorFeaturePolicy {
  tablePresentationControls: boolean;
  mermaidUnsafeHTML: boolean;
  transcodeVideoUploads: boolean;
  openAttachmentsExternally: boolean;
  localFolderNotebook?: boolean;
}

export interface EditorSettings {
  theme: "light" | "dark" | "system";
  editorFontSize: number;
  customFonts: EditorCustomFonts;
  defaultCodeBlockWrap: boolean;
  onDefaultCodeBlockWrapChange: (v: boolean) => void;
  ai: EditorAISettings;
  searchProviders: EditorSearchProvider[];
  customActions: EditorCustomAction[];
  useInternalImageViewer: boolean;
  features: EditorFeaturePolicy;
  redirectAction?: (
    label: string | [string, string],
    payload?: unknown,
  ) => void;
}

export type OpenPageOptions = {
  newTab?: boolean;
  splitOnly?: boolean;
};

export interface EditorPageContext {
  page: Page;
  contentMode: "raw" | "normalized";
  isEditorFullWidth: boolean;
  onContentChange: (
    content: BlockNoteContent,
    options?: { silent?: boolean },
  ) => void;
  onOpenPage: (
    pageId: string,
    wikiTarget?: string,
    options?: OpenPageOptions,
  ) => boolean | void;
  getActivePageLocalFilePath: () => string | null;
  getActivePageLocalFolderRoot: () => string | null;
  onOpenMarkdownPath?: (source: string) => Promise<boolean>;
  onOpenAttachment?: (
    source: string,
    fileName: string,
  ) => Promise<OpenExternalResourceResult>;
  searchPages: (query: string, options?: { includeFolders?: boolean }) => AiReferenceSuggestionItem[];
  resolvePageContexts: (
    refs: AiFileReferenceAttrs[],
  ) => ResolvedAiReferenceContext[];
  getLatestPage?: (pageId: string) => Page | null;
  resolvePageMention?: (target: PageMentionProps, options?: { includeReference?: boolean }) => {
    title: string;
    notebookName: string;
    reference?: AiReferenceSuggestionItem;
  } | null;
  subscribePageMetadata?: (listener: () => void) => () => void;
  createPageMentionTarget?: (title: string) => Promise<AiReferenceSuggestionItem | null>;
  onPromotePreview?: () => void;
}

export interface EditorProps {
  platform: EditorPlatform;
  settings: EditorSettings;
  pageContext: EditorPageContext;
  readonly?: boolean;
}

const EditorSettingsContext = createContext<EditorSettings | null>(null);
const EditorPageContextContext = createContext<EditorPageContext | null>(null);

export function EditorHostProvider({
  settings,
  pageContext,
  children,
}: {
  settings: EditorSettings;
  pageContext: EditorPageContext;
  children: ReactNode;
}) {
  return (
    <EditorSettingsContext.Provider value={settings}>
      <EditorPageContextContext.Provider value={pageContext}>
        {children}
      </EditorPageContextContext.Provider>
    </EditorSettingsContext.Provider>
  );
}

export function useEditorSettings(): EditorSettings {
  const ctx = useContext(EditorSettingsContext);
  if (!ctx) {
    throw new Error(
      "useEditorSettings 必须在 <EditorHostProvider> 内使用（宿主需注入 settings）。",
    );
  }
  return ctx;
}

export function useEditorPageContext(): EditorPageContext {
  const ctx = useContext(EditorPageContextContext);
  if (!ctx) {
    throw new Error(
      "useEditorPageContext 必须在 <EditorHostProvider> 内使用（宿主需注入 pageContext）。",
    );
  }
  return ctx;
}
