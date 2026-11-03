import { useEffect } from "react";
import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";
import { getFormatLocale } from "@/i18n/runtime";
import { scopeRange } from "@/lib/reflection/scopeRange";
import { previousWeek } from "@/lib/reflection/weekRange";
import { ReflectionBody } from "@/pages/workspace/components/sidebar/reflection/ReflectionBody";
import { ReflectionHeader } from "@/pages/workspace/components/sidebar/reflection/ReflectionHeader";
import { ReflectionScheduleTag } from "@/pages/workspace/components/sidebar/reflection/ReflectionScheduleTag";
import { requestMainSnapshot } from "@/windows/data/mainSnapshot";
import { openPageInMain, openSettingsInMain, useAuxiliaryWindow } from "@/windows/AuxiliaryWindowContext";
import { StandaloneWindowShell } from "@/windows/shell/StandaloneWindowShell";
import { useReflectionWindowModel } from "./useReflectionWindowModel";

const text = createTranslator(i18nYaml<"src/windows/views/ReflectionWindow.tsx#block1:1">`
zh-Hans:
  title: "反思"
en:
  title: "Reflection"
ja:
  title: "振り返り"
`);

export function ReflectionWindow() {
  useLocale();
  const { resizable } = useAuxiliaryWindow();
  const model = useReflectionWindowModel();
  const range = model.data?.range ?? scopeRange(model.scope);
  const locale = getFormatLocale();
  const date = new Intl.DateTimeFormat(locale, { year: "numeric", month: "numeric", day: "numeric" });
  const context = `${date.format(range.start)} – ${date.format(range.end - 1)}`;

  useEffect(() => {
    void requestMainSnapshot("reflection-seen", 2, { weekKey: previousWeek().key });
  }, []);

  const { generating, refreshSnapshots } = model;
  useEffect(() => {
    if (!generating) return;
    const timer = window.setInterval(refreshSnapshots, 2_000);
    return () => window.clearInterval(timer);
  }, [generating, refreshSnapshots]);

  return (
    <StandaloneWindowShell
      title={text("title")}
      context={context}
      maximizable={resizable}
      actions={(
        <>
          <ReflectionScheduleTag range={range} enabled={model.consented && model.aiReady} />
          <ReflectionHeader
            scope={model.scope}
            busy={model.loading || model.generating}
            onScopeChange={model.setScope}
            onRefresh={model.refresh}
          />
        </>
      )}
    >
      <ReflectionBody
        scope={model.scope}
        data={model.data}
        pages={model.pages}
        state={model.state}
        report={model.report}
        failureMessage={model.failureMessage}
        onEnable={model.enable}
        onOpenSettings={() => void openSettingsInMain("ai")}
        onRetry={model.refresh}
        onScopeChange={model.setScope}
        onOpenNote={(pageId) => void openPageInMain(pageId)}
      />
    </StandaloneWindowShell>
  );
}
