import { Button } from "@/components/ui/button";
import { isElectronHost } from "@/lib/local-vault";
import { usePageEmptyState } from "./empty-state/usePageEmptyState";

export function PageEmptyState() {
  const { isLocalFolder, actions } = usePageEmptyState();
  const needsFolder = isElectronHost && !isLocalFolder;
  const [primary, ...secondary] = actions;

  return (
    <div className="workspace-page-empty flex h-full items-center justify-center overflow-y-auto bg-[hsl(var(--goose-editor-bg))] px-6 py-10">
      <div className="w-full max-w-sm">
        <h1 className="mb-3 text-xl font-medium text-foreground">
          {needsFolder ? "打开一个笔记文件夹" : "从一篇笔记开始"}
        </h1>
        <p className="mb-6 text-xs leading-relaxed text-muted-foreground">
          {needsFolder ? "关联本地文件夹，开始记录。" : "选择左侧笔记，或新建一篇。"}
        </p>
        {primary && (
          <Button type="button" size="sm" onClick={() => { void primary.onClick(); }}>
            {primary.title}
          </Button>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          {secondary.map(action => (
            <Button contentStyle="preserve" variant="ghost" size={null}
              key={action.key} type="button" onClick={() => { void action.onClick(); }}
              className="rounded-lg py-1 text-xs text-muted-foreground hover:text-foreground">
              {action.title}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
