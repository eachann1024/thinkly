import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/new-page-name.ts#localMessages:1">`
zh-Hans:
  enterAFileName: "请输入文件名称"
  theFileNameContainsUnsupportedCharacters: "文件名称包含不支持的字符"
en:
  enterAFileName: "Enter a file name"
  theFileNameContainsUnsupportedCharacters: "The file name contains unsupported characters"
`;
const uiText = createTranslator(localMessages);
export function normalizeNewFileName(value: string): string {
  const name = value.trim().replace(/\.(md|markdown)$/i, "").trim();
  if (!name || name === "." || name === "..") throw new Error(uiText("enterAFileName"));
  if (/[\\/:*?"<>|]/.test(name) || Array.from(name).some((char) => char.charCodeAt(0) < 32) || /[. ]$/.test(name)) {
    throw new Error(uiText("theFileNameContainsUnsupportedCharacters"));
  }
  return name;
}
