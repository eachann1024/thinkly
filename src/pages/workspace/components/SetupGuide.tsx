import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/SetupGuide.tsx#localMessages:1">`
zh-Hans:
  progress: "第 {{step}} 步，共 {{total}} 步"
  appearance: "外观"
  customizeAppearance: "设置外观"
  reading: "阅读"
  adjustReadingPreferences: "调整阅读体验"
  setupGuide: "设置引导"
  setupSteps: "设置步骤"
  appearancePreview: "外观即时预览"
  exitSetup: "退出引导"
  back: "上一步"
  next: "下一步"
  finishSetup: "完成设置"
en:
  progress: "Step {{step}} of {{total}}"
  appearance: "Appearance"
  customizeAppearance: "Customize appearance"
  reading: "Reading"
  adjustReadingPreferences: "Adjust reading preferences"
  setupGuide: "Setup guide"
  setupSteps: "Setup steps"
  appearancePreview: "Appearance preview"
  exitSetup: "Exit setup"
  back: "Back"
  next: "Next"
  finishSetup: "Finish setup"
ja:
  progress: "ステップ {{step}} / {{total}}"
  appearance: "外観"
  customizeAppearance: "外観を設定"
  reading: "読みやすさ"
  adjustReadingPreferences: "閲覧設定を調整"
  setupGuide: "セットアップガイド"
  setupSteps: "セットアップの手順"
  appearancePreview: "外観のリアルタイムプレビュー"
  exitSetup: "ガイドを終了"
  back: "戻る"
  next: "次へ"
  finishSetup: "設定を完了"
`;
const uiText = createTranslator(localMessages);
import { useLayoutEffect, useRef, useState } from "react";
import * as GooseIcons from "@/components/ui/icons";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { isElectronRuntime } from "@/lib/electron/runtime";
import { isSetupGuideVisible } from "@/lib/setupGuide";
import { useSettings } from "@/stores/useSettings";
import { AppearanceEditorPreview } from "./sidebar/AppearanceEditorPreview";
import { SettingsAppearance } from "./sidebar/SettingsAppearance";
import { WinWindowControls } from "./page/WinWindowControls";
import "./setup-guide.css";
const STEPS = [
  { get label() { return uiText("appearance"); }, get title() { return uiText("customizeAppearance"); } },
  { get label() { return uiText("reading"); }, get title() { return uiText("adjustReadingPreferences"); } },
] as const;

type SetupStep = 0 | 1;

export function getNativePlatform(): "mac" | "win" | "linux" | "web" {
  if (!isElectronRuntime() || typeof navigator === "undefined") return "web";
  if (/Mac/i.test(navigator.platform)) return "mac";
  if (/Win/i.test(navigator.platform)) return "win";
  if (/Linux/i.test(navigator.platform)) return "linux";
  return "web";
}

export function SetupGuide() {
  useLocale();
  const visible = useSettings((settings) => isSetupGuideVisible(settings));
  return visible ? <SetupGuideFlow /> : null;
}

function SetupGuideFlow() {
  useLocale();
  const appearance = useSettings(
    useShallow((settings) => ({
      theme: settings.theme,
      setTheme: settings.setTheme,
      accentColor: settings.accentColor,
      setAccentColor: settings.setAccentColor,
      customFonts: settings.customFonts,
      setCustomFont: settings.setCustomFont,
      uiFontSize: settings.uiFontSize,
      setUIFontSize: settings.setUIFontSize,
      editorFontSize: settings.editorFontSize,
      editorLineHeight: settings.editorLineHeight,
      increaseEditorFontSize: settings.increaseEditorFontSize,
      decreaseEditorFontSize: settings.decreaseEditorFontSize,
    })),
  );
  const [step, setStep] = useState<SetupStep>(0);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const controlsRef = useRef<HTMLElement | null>(null);
  const nativePlatform = getNativePlatform();

  useLayoutEffect(() => {
    headingRef.current?.focus();
    if (controlsRef.current) controlsRef.current.scrollTop = 0;
  }, [step]);

  const closeGuide = () => {
    useSettings.setState({ setupGuideSeen: true, setupGuideOpen: false });
  };

  const moveToStep = (nextStep: SetupStep) => {
    setStep(nextStep);
  };

  return (
    <main
      className="setup-guide"
      data-native-platform={nativePlatform}
      aria-label={uiText("setupGuide")}
    >
      <div className="setup-guide-windowbar">
        {(nativePlatform === "win" || nativePlatform === "linux") && (
          <WinWindowControls />
        )}
      </div>

      <header className="setup-guide-header">
        <ol className="setup-guide-steps" aria-label={uiText("setupSteps")}>
          {STEPS.map((item, index) => {
            const active = index === step;
            const complete = index < step;
            return (
              <li
                key={item.label}
                aria-current={active ? "step" : undefined}
                data-active={active || undefined}
                data-complete={complete || undefined}
              >
                <span className="setup-guide-step-marker" aria-hidden="true">
                  {complete ? <GooseIcons.Check size={14} /> : index + 1}
                </span>
                <span>{item.label}</span>
              </li>
            );
          })}
        </ol>
        <div className="setup-guide-heading">
          <p className="text-xs text-muted-foreground">{uiText("progress", {step: step + 1, total: STEPS.length})}</p>
          <h1 id="setup-guide-title" ref={headingRef} tabIndex={-1}>
            {STEPS[step].title}
          </h1>
        </div>
      </header>

      <div className="setup-guide-content">
        <section className="setup-guide-preview" aria-label={uiText("appearancePreview")}>
          <AppearanceEditorPreview
            editorFontSize={appearance.editorFontSize}
            editorLineHeight={appearance.editorLineHeight}
            uiFontSize={appearance.uiFontSize}
            showDemoEnglish={false}
          />
        </section>

        <section
          ref={controlsRef}
          className="setup-guide-controls"
          aria-labelledby="setup-guide-title"
        >
          <div
            className="setup-guide-control-step"
            hidden={step !== 0}
            inert={step !== 0 ? true : undefined}
            aria-hidden={step !== 0}
          >
            <SettingsAppearance
              {...appearance}
              section="appearance"
              showPreview={false}
            />
          </div>
          <div
            className="setup-guide-control-step"
            hidden={step !== 1}
            inert={step !== 1 ? true : undefined}
            aria-hidden={step !== 1}
          >
            <SettingsAppearance
              {...appearance}
              section="reading"
              showPreview={false}
            />
          </div>
        </section>
      </div>

      <footer className="setup-guide-footer">
        {step < 1 && (
          <Button type="button" variant="ghost" onClick={() => closeGuide()}>
            {uiText("exitSetup")}</Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => moveToStep(0)}
          disabled={step === 0}
        >
          {uiText("back")}</Button>
        <div className="setup-guide-footer-actions">
          {step < 1 ? (
            <Button type="button" onClick={() => moveToStep(1)}>
              {uiText("next")}</Button>
          ) : (
            <Button type="button" onClick={() => closeGuide()}>
              {uiText("finishSetup")}</Button>
          )}
        </div>
      </footer>
    </main>
  );
}
