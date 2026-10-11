import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText } from "@/components/ui/icons";

export function BootstrapScreen({ lean, error }: { lean: boolean; error?: unknown }) {
  const message = error instanceof Error ? error.message : error ? String(error) : undefined;
  return (
    <main className="bootstrap-screen">
      <EmptyState icon={FileText} role={error ? "alert" : "status"}
        title={error ? "鹅的笔记暂时无法打开" : lean ? "正在恢复速记" : "正在打开鹅的笔记"}
        details={message}
        action={error ? (
          <Button contentStyle="preserve" variant="ghost" size={null} type="button"
            className="rounded-lg px-2 py-1 text-xs" onClick={() => window.location.reload()}>
            重新加载
          </Button>
        ) : undefined} />
    </main>
  );
}
