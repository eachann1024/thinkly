import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/bootstrap/BootstrapScreen.tsx#localMessages:1">`
zh-Hans:
  openFailed: "Thinkly 暂时无法打开"
  restoring: "正在恢复速记"
  opening: "正在打开Thinkly"
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
import { DotIconArt } from "@/components/ui/dot-matrix/illustrations/DotIconArt";
import { DotDecor } from "@/components/ui/dot-matrix/decor";
import { ReviewedStateArt } from "@/components/ui/dot-matrix/illustrations/ReviewedStateArt";
import { StateArtBackdrop } from "@/components/ui/dot-matrix/illustrations/StateArtBackdrop";

export function BootstrapScreen({ lean, error }: { lean: boolean; error?: unknown }) {
  useLocale();
  const message = error instanceof Error ? error.message : error ? String(error) : undefined;
  return (
    <main className="bootstrap-screen relative overflow-hidden">
      {lean && !error ? <DotDecor preset="bootstrap" /> : <StateArtBackdrop kind={error ? "openError" : "opening"} />}
      <EmptyState className="relative" icon={FileText} role={error ? "alert" : "status"}
        illustration={error
          ? <ReviewedStateArt key="failed" kind="openError" />
          : lean ? <DotIconArt key="restoring" icon="doc" size={44} width={120} height={84} halo motion="progress-reverse" />
          : <ReviewedStateArt key="loading" kind="opening" />}
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
