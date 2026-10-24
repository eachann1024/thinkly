import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/character-onboarding/CharacterOnboarding.tsx#localMessages:1">`
zh-Hans:
  title: "选择你的形象"
  characters: "形象"
  confirm: "就选它"
en:
  title: "Choose your character"
  characters: "Characters"
  confirm: "Choose"
ja:
  title: "キャラクターを選ぶ"
  characters: "キャラクター"
  confirm: "これにする"
`;
const uiText = createTranslator(localMessages);
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { CharacterPicker, DEFAULT_CHARACTER_ID, DotDecor } from "@/components/ui/dot-matrix";
import { isCharacterGuideVisible } from "@/lib/characterGuide";
import { UI_LAYERS } from "@/lib/uiLayers";
import { useSettings } from "@/stores/useSettings";
import { WinWindowControls } from "../page/WinWindowControls";
import { getNativePlatform } from "../SetupGuide";
import "../setup-guide.css";
import "./character-onboarding.css";

export function CharacterOnboarding() {
  useLocale();
  const visible = useSettings(isCharacterGuideVisible);
  if (!visible || typeof document === "undefined") return null;
  return createPortal(<CharacterOnboardingFlow />, document.body);
}

const subscribeResize = (notify: () => void) => {
  window.addEventListener("resize", notify);
  return () => window.removeEventListener("resize", notify);
};

function spriteSizeForWindow() {
  const { innerWidth: w, innerHeight: h } = window;
  if (w < 680 || h < 600) return 80;
  if (w < 960 || h < 720) return 96;
  return 112;
}

function CharacterOnboardingFlow() {
  useLocale();
  const [selected, setSelected] = useState(DEFAULT_CHARACTER_ID);
  const spriteSize = useSyncExternalStore(subscribeResize, spriteSizeForWindow);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const nativePlatform = getNativePlatform();

  useLayoutEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <main
      className="setup-guide character-onboarding"
      style={{ zIndex: UI_LAYERS.modal }}
      data-native-platform={nativePlatform}
      aria-labelledby="character-onboarding-title"
    >
      <div className="setup-guide-windowbar">
        {(nativePlatform === "win" || nativePlatform === "linux") && <WinWindowControls />}
      </div>
      <div className="character-onboarding-stage">
        <DotDecor preset="character" className="character-onboarding-decor" />
        <section className="character-onboarding-panel">
          <h1 id="character-onboarding-title" ref={headingRef} tabIndex={-1} className="character-onboarding-title">
            {uiText("title")}
          </h1>
          <CharacterPicker
            value={selected}
            onChange={setSelected}
            spriteSize={spriteSize}
            label={uiText("characters")}
            className="character-onboarding-picker"
          />
          <Button
            type="button"
            className="character-onboarding-confirm"
            onClick={() => useSettings.getState().setCharacterId(selected)}
          >
            {uiText("confirm")}
          </Button>
        </section>
      </div>
    </main>
  );
}
