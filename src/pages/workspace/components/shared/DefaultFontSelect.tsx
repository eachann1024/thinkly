import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/shared/DefaultFontSelect.tsx#localMessages:1">`
zh-Hans:
  textFont: "正文字体"
en:
  textFont: "Text font"
ja:
  textFont: "本文フォント"
`;
const uiText = createTranslator(localMessages);
import { Label } from "@/components/ui/label";
import { LocalFontSelect } from "./LocalFontSelect";

export function DefaultFontSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  useLocale();
  return (
    <div className="default-font-select space-y-3">
      <div className="flex flex-col gap-3">
        <Label htmlFor={id}>{uiText("textFont")}</Label>
        <LocalFontSelect
          id={id}
          label={uiText("textFont")}
          value={value}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
