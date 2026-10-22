import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createChecker } from "./lib/check";
import {
  characterGuideShouldShow,
  firstRunSurface,
  resolveStoredCharacterId,
} from "../../src/lib/characterChoice";

const IDS = ["a", "b", "c", "d", "e", "f", "g"] as const;

function surface(input: {
  hydrated?: boolean;
  characterId?: string | null;
  setupGuideSeen?: boolean;
  setupGuideOpen?: boolean;
}, known: readonly string[] = IDS) {
  return firstRunSurface({
    _hasHydrated: input.hydrated ?? true,
    characterId: input.characterId ?? null,
    setupGuideSeen: input.setupGuideSeen ?? false,
    setupGuideOpen: input.setupGuideOpen ?? false,
  }, known);
}

/** 新用户先弹出形象选择；已选过的不再弹，欢迎动画不再播放。 */
export default async function run(): Promise<number> {
  const checker = createChecker();
  const { check } = checker;
  const root = process.cwd();
  const read = (file: string) => readFileSync(path.join(root, file), "utf8");

  console.log("· 谁会看到形象选择");
  check("没选过且已水合时弹出", characterGuideShouldShow({
    hydrated: true, characterId: null, knownCharacterIds: IDS,
  }) && surface({ characterId: null }) === "character");
  check("还没水合时不弹", !characterGuideShouldShow({
    hydrated: false, characterId: null, knownCharacterIds: IDS,
  }) && surface({ hydrated: false, characterId: null }) === "app");
  check("已选狼尾不再弹，接着设置引导", surface({ characterId: "f", setupGuideSeen: false }) === "setup");
  check("已选并且看过设置引导就进工作区", surface({ characterId: "f", setupGuideSeen: true }) === "app");
  check("重新打开设置引导不改形象", surface({
    characterId: "f", setupGuideSeen: true, setupGuideOpen: true,
  }) === "setup");
  check("所选形象已不存在时再让人选", surface({ characterId: "retired", setupGuideSeen: true }) === "character");
  check("没有可选项时不弹空层", surface({ characterId: null }, []) === "setup");

  console.log("· 已有选择不被改写");
  check("保存的形象原样保留", resolveStoredCharacterId("f") === "f" && resolveStoredCharacterId("a") === "a");
  check("没写过形象保持未选", resolveStoredCharacterId(undefined) === null && resolveStoredCharacterId(null) === null);
  check("不会塞一个默认形象", resolveStoredCharacterId(undefined) === null && resolveStoredCharacterId("") === null);

  console.log("· 欢迎动画已删除");
  const app = read("src/App.tsx");
  const setup = read("src/pages/workspace/components/SetupGuide.tsx");
  const data = read("src/pages/workspace/components/sidebar/settings/SettingsDataPanel.tsx");
  const preload = read("electron/preload/index.ts");
  check("没有短片文件", !existsSync(path.join(root, "public/intro/goose-intro.mp4"))
    && !existsSync(path.join(root, "public/intro/goose-intro-poster.jpg"))
    && !existsSync(path.join(root, "src/stores/introVideo.ts"))
    && !existsSync(path.join(root, "src/pages/workspace/components/intro-video"))
    && !existsSync(path.join(root, "electron/main/windows/welcome.ts")));
  const choice = read("src/lib/characterChoice.ts");
  check("没有播放或重播入口", !app.includes("IntroVideo") && !app.includes("useIntroVideo")
    && !setup.includes("useIntroVideo") && !setup.includes("playIntro")
    && !data.includes("replayAnimation") && !data.includes("useIntroVideo")
    && !preload.includes("prepareWelcomeWindow") && !preload.includes("restoreWelcomeWindow")
    && !choice.includes("introVideo") && !choice.includes("goose-intro"));

  return checker.failed;
}
