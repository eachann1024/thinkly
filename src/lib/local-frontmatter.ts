import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/local-frontmatter.ts#localMessages:1">`
zh-Hans:
  theYamlFrontmatterIsNotClosedSavingHasBeen: "YAML 前置区未闭合，已阻止保存"
  theYamlFrontmatterIsInvalidSavingHasBeenBlocked: "YAML 前置区格式异常，已阻止保存"
  couldnTSerializeYaml: "YAML 序列化失败"
en:
  theYamlFrontmatterIsNotClosedSavingHasBeen: "The YAML frontmatter is not closed. Saving has been blocked."
  theYamlFrontmatterIsInvalidSavingHasBeenBlocked: "The YAML frontmatter is invalid. Saving has been blocked."
  couldnTSerializeYaml: "Couldn’t serialize YAML"
ja:
  theYamlFrontmatterIsNotClosedSavingHasBeen: "YAML フロントマターが閉じられていないため、保存をブロックしました"
  theYamlFrontmatterIsInvalidSavingHasBeenBlocked: "YAML フロントマターの形式が正しくないため、保存をブロックしました"
  couldnTSerializeYaml: "YAML をシリアライズできませんでした"
`;
const uiText = createTranslator(localMessages);
import { parseLocalFrontmatterBlob } from "./local-frontmatter/parser";
export {
  parseLocalFrontmatterBlob,
  pageSettingsFromMarkdown,
} from "./local-frontmatter/parser";
import { stringify as stringifyYaml } from "yaml";
import type { PageContent } from "@/components/editor/utils/blocknote-content";
import { extractFrontmatter } from "./markdown-raw-guard";
import {
  GOOSE_LAYOUT_KEY,
  GOOSE_FONT_KEY,
  GOOSE_LOCKED_KEY,
  GOOSE_PINNED_KEY,
  GOOSE_FAVORITE_KEY,
  VALID_FONTS,
  normalizePageLayout,
  type LocalPageFrontmatterSettings,
} from "./local-frontmatter/settings";
export {
  GOOSE_LAYOUT_KEY,
  GOOSE_FONT_KEY,
  GOOSE_LOCKED_KEY,
  GOOSE_PINNED_KEY,
  GOOSE_FAVORITE_KEY,
  LOCAL_PAGE_FRONTMATTER_SETTINGS_KEYS,
  isLocalPageFrontmatterSettingsUpdate,
  normalizePageLayout,
  type LocalPageFrontmatterSettingsKey,
  type LocalPageFrontmatterSettings,
} from "./local-frontmatter/settings";

function wrapFrontmatter(yamlBody: string): string {
  const body = yamlBody.replace(/\s+$/, "");
  return body ? `---\n${body}\n---` : "---\n---";
}

export type MergeFrontmatterResult = {
  blob: string | undefined;
  parseFailed: boolean;
  error?: string;
  settings: LocalPageFrontmatterSettings;
};

export function isGooseFrontmatterKey(key: string): boolean {
  return key.startsWith("goose-");
}

export function frontmatterBodyHasUserVisibleKeys(
  yamlBody: string | null | undefined,
): boolean {
  const parsed = parseLocalFrontmatterBlob(yamlBody);
  if (!parsed.ok) return Boolean((yamlBody ?? "").trim());
  return Object.keys(parsed.data).some((key) => !isGooseFrontmatterKey(key));
}

export function getContentFrontmatterBody(
  content: PageContent | null | undefined,
): string | null {
  if (!content || typeof content !== "object") return null;
  const blocks = Array.isArray(content) ? content : content?.content;
  if (!Array.isArray(blocks)) return null;
  const first = blocks[0] as
    | { type?: string; props?: Record<string, unknown>; content?: unknown }
    | undefined;
  if (first?.type !== "codeBlock") return null;
  if (first?.props?.language !== "yaml-frontmatter") return null;
  const c = first.content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return c.map((n: any) => n?.text ?? "").join("");
  return null;
}

export function applyFrontmatterBodyToContent(
  content: PageContent | null | undefined,
  yamlBody: string | null | undefined,
): PageContent {
  const blocks = Array.isArray(content)
    ? content
    : ((content?.content as any[] | undefined) ?? []);
  const trimmed = (yamlBody ?? "").replace(/\s+$/, "");
  const shouldShow =
    Boolean(trimmed) && frontmatterBodyHasUserVisibleKeys(trimmed);
  const fmBlock = shouldShow
    ? {
        type: "codeBlock",
        props: { language: "yaml-frontmatter" },
        content: trimmed,
      }
    : null;

  if (
    blocks[0]?.type === "codeBlock" &&
    blocks[0]?.props?.language === "yaml-frontmatter"
  ) {
    if (!fmBlock) {
      return blocks.slice(1) as PageContent;
    }
    return [
      { ...blocks[0], content: trimmed },
      ...blocks.slice(1),
    ] as PageContent;
  }

  return fmBlock
    ? ([fmBlock, ...blocks] as PageContent)
    : (blocks as PageContent);
}

export function mergeSettingsIntoFrontmatterHeader(
  markdown: string,
  settings: LocalPageFrontmatterSettings,
): { markdown: string; frontmatter: string | undefined } | null {
  if (!/^---\s*\n/.test(markdown)) return null;
  const { frontmatter, body } = extractFrontmatter(markdown);
  if (!frontmatter) throw new Error(uiText("theYamlFrontmatterIsNotClosedSavingHasBeen"));
  const merged = mergeLocalPageSettingsIntoFrontmatter(frontmatter, settings);
  if (merged.parseFailed) throw new Error(uiText("theYamlFrontmatterIsInvalidSavingHasBeenBlocked"));
  const mergedBlob = merged.blob;
  return {
    markdown: mergedBlob ? `${mergedBlob}\n\n${body}` : body,
    frontmatter: mergedBlob,
  };
}

export function mergeLocalPageSettingsIntoFrontmatter(
  existingBlob: string | null | undefined,
  settings: LocalPageFrontmatterSettings,
): MergeFrontmatterResult {
  const fontFamily = VALID_FONTS.has(settings.fontFamily)
    ? settings.fontFamily
    : "default";
  const pageLayout =
    settings.pageLayout === undefined
      ? undefined
      : normalizePageLayout(settings.pageLayout);
  const isLocked = Boolean(settings.isLocked);
  const isPinned = Boolean(settings.isPinned);
  const isFavorite = Boolean(settings.isFavorite);
  const normalized: LocalPageFrontmatterSettings = {
    fontFamily,
    pageLayout,
    isLocked,
    isPinned,
    isFavorite,
  };

  const parsed = parseLocalFrontmatterBlob(existingBlob);
  if (!parsed.ok) {
    return {
      blob: existingBlob?.trim() ? existingBlob : undefined,
      parseFailed: true,
      error: parsed.error,
      settings: normalized,
    };
  }

  const data: Record<string, unknown> = { ...parsed.data };

  if (pageLayout === undefined) {
    delete data[GOOSE_LAYOUT_KEY];
  } else {
    data[GOOSE_LAYOUT_KEY] = pageLayout;
  }

  if (fontFamily === "default") {
    delete data[GOOSE_FONT_KEY];
  } else {
    data[GOOSE_FONT_KEY] = fontFamily;
  }

  if (!isLocked) {
    delete data[GOOSE_LOCKED_KEY];
  } else {
    data[GOOSE_LOCKED_KEY] = true;
  }

  if (!isPinned) {
    delete data[GOOSE_PINNED_KEY];
  } else {
    data[GOOSE_PINNED_KEY] = true;
  }

  if (!isFavorite) {
    delete data[GOOSE_FAVORITE_KEY];
  } else {
    data[GOOSE_FAVORITE_KEY] = true;
  }

  if (Object.keys(data).length === 0) {
    return {
      blob: undefined,
      parseFailed: false,
      settings: normalized,
    };
  }

  try {
    const yamlBody = stringifyYaml(data, {
      lineWidth: 0,
    }).replace(/\s+$/, "");
    return {
      blob: wrapFrontmatter(yamlBody),
      parseFailed: false,
      settings: normalized,
    };
  } catch (error) {
    return {
      blob: existingBlob?.trim() ? existingBlob : undefined,
      parseFailed: true,
      error: error instanceof Error ? error.message : uiText("couldnTSerializeYaml"),
      settings: normalized,
    };
  }
}
