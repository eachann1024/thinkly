import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/bootstrap/BootstrapScreen.tsx#localMessages:1">`
zh-Hans:
  openFailed: "鹅的笔记暂时无法打开"
  restoring: "正在恢复速记"
  opening: "正在打开鹅的笔记"
  reload: "重新加载"
en:
  openFailed: "Goose Note couldn’t open"
  restoring: "Restoring Quick Note"
  opening: "Opening Goose Note"
  reload: "Reload"
`;
const uiText = createTranslator(localMessages);
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText } from "@/components/ui/icons";

export function BootstrapScreen({ lean, error }: { lean: boolean; error?: unknown }) {
  useLocale();
  const message = error instanceof Error ? error.message : error ? String(error) : undefined;
  return (
    <main className="bootstrap-screen">
      <EmptyState icon={FileText} role={error ? "alert" : "status"}
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
