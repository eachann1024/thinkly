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
import { useIntroVideo } from "@/stores/introVideo";

const STEPS = [
  { label: "外观", title: "设置外观" },
  { label: "阅读", title: "调整阅读体验" },
] as const;

type SetupStep = 0 | 1;

function getNativePlatform(): "mac" | "win" | "linux" | "web" {
  if (!isElectronRuntime() || typeof navigator === "undefined") return "web";
  if (/Mac/i.test(navigator.platform)) return "mac";
  if (/Win/i.test(navigator.platform)) return "win";
  if (/Linux/i.test(navigator.platform)) return "linux";
  return "web";
}

export function SetupGuide() {
  const visible = useSettings((settings) => isSetupGuideVisible(settings));
  return visible ? <SetupGuideFlow /> : null;
}

function SetupGuideFlow() {
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
    const firstRun = !useSettings.getState().setupGuideSeen;
    useSettings.setState({ setupGuideSeen: true, setupGuideOpen: false });
    if (firstRun) useIntroVideo.getState().show();
  };

  const moveToStep = (nextStep: SetupStep) => {
    setStep(nextStep);
  };

  return (
    <main
      className="setup-guide"
      data-native-platform={nativePlatform}
      aria-label="设置引导"
    >
      <div className="setup-guide-windowbar">
        {(nativePlatform === "win" || nativePlatform === "linux") && (
          <WinWindowControls />
        )}
      </div>

      <header className="setup-guide-header">
        <ol className="setup-guide-steps" aria-label="设置步骤">
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
          <p className="text-xs text-muted-foreground">第 {step + 1} 步，共 {STEPS.length} 步</p>
          <h1 id="setup-guide-title" ref={headingRef} tabIndex={-1}>
            {STEPS[step].title}
          </h1>
        </div>
      </header>

      <div className="setup-guide-content">
        <section className="setup-guide-preview" aria-label="外观即时预览">
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
          <Button type="button" variant="ghost" onClick={closeGuide}>
            退出引导
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => moveToStep(0)}
          disabled={step === 0}
        >
          上一步
        </Button>
        <div className="setup-guide-footer-actions">
          {step < 1 ? (
            <Button type="button" onClick={() => moveToStep(1)}>
              下一步
            </Button>
          ) : (
            <Button type="button" onClick={closeGuide}>
              完成设置
            </Button>
          )}
        </div>
      </footer>
    </main>
  );
}
