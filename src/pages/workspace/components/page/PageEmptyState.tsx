import { Button } from "@/components/ui/button";
import { FilePlus2, FolderOpen, Search, Sparkles } from "@/components/ui/icons";
import { isElectronHost } from "@/lib/local-vault";
import { usePageEmptyState } from "./empty-state/usePageEmptyState";
import "./empty-state/page-empty-state.css";

function EmptyStateActionIcon({ actionKey }: { actionKey: string }) {
  if (actionKey === "create-page") return <FilePlus2 aria-hidden="true" />;
  if (actionKey === "ai") return <Sparkles aria-hidden="true" />;
  if (actionKey === "search") return <Search aria-hidden="true" />;
  return <FolderOpen aria-hidden="true" />;
}

export function PageEmptyState() {
  const { isLocalFolder, actions } = usePageEmptyState();
  const needsFolder = isElectronHost && !isLocalFolder;
  const [primary, ...secondary] = actions;

  return (
    <div className="workspace-page-empty h-full overflow-y-auto bg-[hsl(var(--goose-editor-bg))]">
      <div className="page-empty-state">
        <img
          className="page-empty-state-illustration"
          src={`${import.meta.env.BASE_URL}illustrations/goose-empty-state.png`}
          width={1254}
          height={1254}
          alt=""
          draggable={false}
        />
        <h1 className="page-empty-state-title text-foreground">
          {needsFolder ? "打开一个笔记文件夹" : "从一篇笔记开始"}
        </h1>
        <p className="page-empty-state-description text-muted-foreground">
          {needsFolder ? "关联本地文件夹，开始记录。" : "选择左侧笔记，或新建一篇。"}
        </p>
        {primary && (
          <Button type="button" size={null}
            className="page-empty-state-primary"
            onClick={() => { void primary.onClick(); }}>
            <EmptyStateActionIcon actionKey={primary.key} />
            {primary.title}
          </Button>
        )}
        <div className="page-empty-state-secondary">
          {secondary.map(action => (
            <Button contentStyle="preserve" variant="ghost" size={null}
              key={action.key} type="button" onClick={() => { void action.onClick(); }}
              className="page-empty-state-link rounded-lg text-muted-foreground hover:text-foreground">
              <EmptyStateActionIcon actionKey={action.key} />
              {action.title}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
