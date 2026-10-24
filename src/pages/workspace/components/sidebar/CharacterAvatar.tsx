import { CharacterSprite, findCharacter } from "@/components/ui/dot-matrix";
import { useSettings } from "@/stores/useSettings";
import "./character-avatar.css";

export function CharacterAvatar() {
  const character = findCharacter(useSettings((state) => state.characterId));
  if (!character) return null;
  return (
    <span className="sidebar-character-avatar" aria-hidden="true">
      <CharacterSprite id={character.id} pose="main" crop="head" size={26} />
    </span>
  );
}

export function useHasCharacter(): boolean {
  return Boolean(findCharacter(useSettings((state) => state.characterId)));
}
