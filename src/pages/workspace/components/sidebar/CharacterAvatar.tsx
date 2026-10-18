import { CharacterSprite, findCharacter } from "@/components/ui/dot-matrix";
import { useSettings } from "@/stores/useSettings";
import "./character-avatar.css";

/** 活动栏设置入口的头像：所选形象的头部；尚未选择形象时返回 null，由调用方回退齿轮。 */
export function CharacterAvatar() {
  const character = findCharacter(useSettings((state) => state.characterId));
  if (!character) return null;
  return (
    <span className="sidebar-character-avatar" aria-hidden="true">
      <CharacterSprite id={character.id} pose="main" crop="head" size={26} />
    </span>
  );
}

/** 是否已选形象：决定设置入口显示头像还是齿轮。 */
export function useHasCharacter(): boolean {
  return Boolean(findCharacter(useSettings((state) => state.characterId)));
}
