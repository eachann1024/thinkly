import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/appearance-settings/CharacterSettings.tsx#localMessages:1">`
zh-Hans:
  character: "形象"
en:
  character: "Character"
ja:
  character: "キャラクター"
`;
const uiText = createTranslator(localMessages);
import { CharacterPicker } from "@/components/ui/dot-matrix";
import { CHARACTER_SETTINGS_ANCHOR } from "@/lib/characterGuide";
import { useSettings } from "@/stores/useSettings";
import { SettingsSectionCard } from "../settings/SettingsSectionCard";

export function CharacterSettings() {
  useLocale();
  const characterId = useSettings((state) => state.characterId);
  const setCharacterId = useSettings((state) => state.setCharacterId);
  return (
    <div data-settings-anchor={CHARACTER_SETTINGS_ANCHOR} className="scroll-mt-4">
      <SettingsSectionCard title={uiText("character")}>
        <CharacterPicker
          value={characterId}
          onChange={setCharacterId}
          spriteSize={72}
          label={uiText("character")}
        />
      </SettingsSectionCard>
    </div>
  );
}
