import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/bootstrap/BootstrapScreen.tsx#localMessages:1">`
zh-Hans:
  openFailed: "思绪 · Thinkly 暂时无法打开"
  restoring: "正在恢复速记"
  opening: "正在打开思绪 · Thinkly"
  reload: "重新加载"
en:
  openFailed: "Thinkly couldn’t open"
  restoring: "Restoring Quick Note"
  opening: "Opening Thinkly"
  reload: "Reload"
ja:
  openFailed: "Thinkly を開けません"
  restoring: "クイックノートを復元しています"
  opening: "Thinkly を開いています"
  reload: "再読み込み"
`;
const uiText = createTranslator(localMessages);
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText } from "@/components/ui/icons";
// 首屏直接引入单个插画，避免经由索引带入其他插画
import { DotIconArt } from "@/components/ui/dot-matrix/illustrations/DotIconArt";
import { DotDecor } from "@/components/ui/dot-matrix/decor";

export function BootstrapScreen({ lean, error }: { lean: boolean; error?: unknown }) {
  useLocale();
  const message = error instanceof Error ? error.message : error ? String(error) : undefined;
  return (
    <main className="bootstrap-screen relative overflow-hidden">
      <DotDecor preset="bootstrap" />
      <EmptyState className="relative" icon={FileText} role={error ? "alert" : "status"}
        illustration={error
          ? <DotIconArt key="failed" icon="docErr" size={44} width={120} height={84} halo motion="alert" />
          : <DotIconArt key="loading" icon="doc" size={44} width={120} height={84} halo motion={lean ? "progress-reverse" : "progress"} />}
        title={error ? uiText("openFailed") : lean ? uiText("restoring") : uiText("opening")}
        details={message}
        action={error ? (
          <Button contentStyle="preserve" variant="ghost" size={null} type="button"
            className="rounded-lg px-2 py-1 text-xs" onClick={() => window.location.reload()}>
            {uiText("reload")}</Button>
        ) : undefined} />
    </main>
  );
}
