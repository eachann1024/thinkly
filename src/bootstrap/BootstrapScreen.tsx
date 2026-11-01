import { useLocale } from "@/i18n";
import { LaunchTrace } from "./LaunchTrace";
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
import { ReviewedStateArt } from "@/components/ui/dot-matrix/illustrations/ReviewedStateArt";
import { StateArtBackdrop } from "@/components/ui/dot-matrix/illustrations/StateArtBackdrop";

export function BootstrapScreen({ lean, error }: { lean: boolean; error?: unknown }) {
  useLocale();
  if (!error) {
    return (
      <main className="bootstrap-screen" role="status">
        {!lean && <LaunchTrace />}
        <span className="sr-only">{lean ? uiText("restoring") : uiText("opening")}</span>
      </main>
    );
  }
  const message = error instanceof Error ? error.message : String(error);
  return (
    <main className="bootstrap-screen relative overflow-hidden">
      <StateArtBackdrop kind="openError" />
      <EmptyState className="relative" icon={FileText} role="alert"
        illustration={<ReviewedStateArt key="failed" kind="openError" />}
        title={uiText("openFailed")}
        details={message}
        action={
          <Button contentStyle="preserve" variant="ghost" size={null} type="button"
            className="rounded-lg px-2 py-1 text-xs" onClick={() => window.location.reload()}>
            {uiText("reload")}</Button>
        } />
    </main>
  );
}
