import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/page/PageEmptyState.tsx#localMessages:1">`
zh-Hans:
  openFolder: "打开一个笔记文件夹"
  startNote: "从一篇笔记开始"
  connectFolder: "关联本地文件夹，开始记录。"
  chooseNote: "选择左侧笔记，或新建一篇。"
en:
  openFolder: "Open a notes folder"
  startNote: "Start with a note"
  connectFolder: "Connect a local folder to start taking notes."
  chooseNote: "Select a note in the sidebar or create a new one."
ja:
  openFolder: "ノートフォルダを開く"
  startNote: "ノートを書き始める"
  connectFolder: "ローカルフォルダを関連付けて、記録を始めましょう。"
  chooseNote: "サイドバーでノートを選択するか、新規作成してください。"
`;
const uiText = createTranslator(localMessages);
import { Button } from "@/components/ui/button";
import { FilePlus2, FolderOpen } from "@/components/ui/icons";
import { usePageEmptyState } from "./empty-state/usePageEmptyState";
import "./empty-state/page-empty-state.css";

function EmptyStateActionIcon({ actionKey }: { actionKey: string }) {
  if (actionKey === "create-page") return <FilePlus2 aria-hidden="true" />;
  return <FolderOpen aria-hidden="true" />;
}

export function PageEmptyState() {
  useLocale();
  const { isLocalFolder, actions } = usePageEmptyState();
  const needsFolder = !isLocalFolder;
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
          {needsFolder ? uiText("openFolder") : uiText("startNote")}
        </h1>
        <p className="page-empty-state-description text-muted-foreground">
          {needsFolder ? uiText("connectFolder") : uiText("chooseNote")}
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
