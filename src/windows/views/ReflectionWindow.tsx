import { useEffect, useState } from "react";
import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";
import { formatScopeSpan } from "@/lib/reflection/relativeDay";
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
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const range = model.data?.range ?? scopeRange(model.scope, now);
  const rangeLabel = formatScopeSpan(range.start, range.end - 1);

  useEffect(() => {
    void requestMainSnapshot("reflection-seen", 2, { weekKey: previousWeek().key });
  }, []);

  return (
    <StandaloneWindowShell
      title={text("title")}
      maximizable={resizable}
      actions={<ReflectionScheduleTag range={range} enabled={model.consented && model.aiReady} />}
    >
      <div className="flex h-full min-h-0 flex-col">
        <ReflectionHeader
          scope={model.scope}
          rangeLabel={rangeLabel}
          busy={model.recordStatus === "loading" || model.generating}
          onScopeChange={model.setScope}
          onRefresh={model.refresh}
        />
        <div className="flex min-h-0 flex-1 flex-col overflow-auto">
          <ReflectionBody
            scope={model.scope}
            data={model.data}
            recordStatus={model.recordStatus}
            rangeLabel={rangeLabel}
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
        </div>
      </div>
    </StandaloneWindowShell>
  );
}
