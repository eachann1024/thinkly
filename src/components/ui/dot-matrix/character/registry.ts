import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/components/ui/dot-matrix/character/registry.ts#localMessages:1">`
zh-Hans:
  a: "卷卷"
  b: "眼镜"
  c: "波波"
  d: "丸子"
  e: "绒帽"
  f: "狼尾"
  g: "大波浪"
en:
  a: "Curly"
  b: "Specs"
  c: "Bob"
  d: "Bun"
  e: "Beanie"
  f: "Wolfy"
  g: "Waves"
ja:
  a: "カーリー"
  b: "メガネ"
  c: "ボブ"
  d: "おだんご"
  e: "ニット帽"
  f: "ウルフ"
  g: "ウェーブ"
`;
const uiText = createTranslator(localMessages);

export const CHARACTER_POSES = ["main", "blink", "open", "fail", "wave"] as const;
export type CharacterPose = (typeof CHARACTER_POSES)[number];
export type CharacterTone = "light" | "dark";
export type CharacterRect = readonly [number, number, number, number];
type AssetLoader = () => Promise<string>;
export type CharacterAssets = Record<CharacterPose, Record<CharacterTone, AssetLoader>>;

export interface CharacterDef {
  id: string;
  readonly name: string;
  eye?: CharacterRect;
  assets: CharacterAssets;
  gray: Partial<Record<`${CharacterPose}-${"full" | "head"}`, AssetLoader>>;
}

const FILES = import.meta.glob<string>("/src/assets/characters/*.png", {
  query: "?inline",
  import: "default",
});

const GRAY = import.meta.glob<string>("/src/assets/characters/gray/*.webp", {
  query: "?inline",
  import: "default",
});

function resolveGray(id: string): CharacterDef["gray"] {
  const gray: CharacterDef["gray"] = {};
  for (const pose of CHARACTER_POSES) {
    const full = GRAY[`/src/assets/characters/gray/${id}-${pose}.webp`];
    const head = GRAY[`/src/assets/characters/gray/${id}-${pose}-head.webp`];
    if (full) gray[`${pose}-full`] = full;
    if (head) gray[`${pose}-head`] = head;
  }
  return gray;
}

function loader(id: string, pose: CharacterPose, tone: CharacterTone): AssetLoader | undefined {
  return FILES[`/src/assets/characters/${id}-${pose}-${tone}.png`];
}

function resolveAssets(id: string): CharacterAssets | undefined {
  const assets = {} as CharacterAssets;
  for (const pose of CHARACTER_POSES) {
    const light = loader(id, pose, "light");
    const dark = loader(id, pose, "dark");
    if (!light || !dark) return undefined;
    assets[pose] = { light, dark };
  }
  return assets;
}

const ENTRIES: { id: string; eye?: CharacterRect }[] = [
  { id: "a", eye: [0.363, 0.316, 0.293, 0.145] },
  { id: "b", eye: [0.344, 0.293, 0.336, 0.141] },
  { id: "c", eye: [0.348, 0.289, 0.328, 0.156] },
  { id: "d", eye: [0.363, 0.309, 0.305, 0.203] },
  { id: "e", eye: [0.355, 0.277, 0.297, 0.188] },
  { id: "f", eye: [0.363, 0.313, 0.301, 0.145] },
  { id: "g", eye: [0.369, 0.246, 0.277, 0.215] },
];

export const CHARACTERS: readonly CharacterDef[] = ENTRIES.flatMap(({ id, eye }) => {
  const assets = resolveAssets(id);
  if (!assets) return [];
  const def: CharacterDef = {
    id,
    eye,
    assets,
    gray: resolveGray(id),
    get name() {
      return uiText(id as "a");
    },
  };
  return [def];
});

export type CharacterGender = "male" | "female";

const CHARACTER_GENDER: Record<string, CharacterGender> = {
  a: "male",
  b: "male",
  e: "male",
  f: "male",
  c: "female",
  d: "female",
  g: "female",
};

export const CHARACTER_GROUPS: readonly (readonly CharacterDef[])[] = (["male", "female"] as const)
  .map((gender) => CHARACTERS.filter((item) => (CHARACTER_GENDER[item.id] ?? "male") === gender))
  .filter((group) => group.length > 0);

export const DEFAULT_CHARACTER_ID = CHARACTERS[0]?.id ?? "a";

export function findCharacter(id: string | null | undefined): CharacterDef | undefined {
  return id ? CHARACTERS.find((item) => item.id === id) : undefined;
}

export const CHARACTER_HEAD_CROP: CharacterRect = [0.16, 0, 0.68, 0.68];
export const CHARACTER_FULL_CROP: CharacterRect = [0, 0, 1, 1];
