import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";
import { useState } from "react";
import { GitBranch } from "@/components/ui/icons";
import { ModuleActivation, ModuleEnabledRow } from "../ModuleActivation";
import { DotDecor } from "@/components/ui/dot-matrix";
import { DotMatrixCommitGraph } from "./DotMatrixCommitGraph";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/git-sync/GitModuleGate.tsx#localMessages:1">`
zh-Hans:
  enableGitSync: "启用 Git 同步"
  turningOffStopsSync: "关闭会停止后台同步。"
  couldNotUpdate: "没能更新 Git 同步开关，请重试。"
en:
  enableGitSync: "Enable Git sync"
  turningOffStopsSync: "Turning this off stops background sync."
  couldNotUpdate: "Couldn't update Git sync. Try again."
ja:
  enableGitSync: "Git 同期を有効にする"
  turningOffStopsSync: "オフにすると、バックグラウンド同期が停止します。"
  couldNotUpdate: "Git 同期の切り替えを更新できませんでした。もう一度お試しください。"
`;
const uiText = createTranslator(localMessages);

export function GitModuleActivation({ onEnable }: { onEnable: () => Promise<unknown> }) {
  useLocale();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="settings-groups">
      <div>
        <ModuleActivation
          icon={GitBranch}
          label={uiText("enableGitSync")}
          disabled={pending}
          error={error}
          illustration={<DotMatrixCommitGraph className="block shrink-0 text-foreground" />}
          decoration={<DotDecor preset="gitGate" />}
          onEnable={() => {
            if (pending) return;
            setPending(true);
            setError("");
            void onEnable().then(
              () => setError(""),
              () => setError(uiText("couldNotUpdate")),
            ).finally(() => setPending(false));
          }}
        />
      </div>
    </div>
  );
}

export function GitModuleSwitch({
  disabled,
  onDisable,
}: {
  disabled?: boolean;
  onDisable: () => Promise<unknown>;
}) {
  useLocale();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="settings-groups">
      <div>
        <ModuleEnabledRow
          id="git-module-enabled"
          icon={GitBranch}
          label={uiText("enableGitSync")}
          description={uiText("turningOffStopsSync")}
          checked
          disabled={disabled || pending}
          error={error}
          onCheckedChange={(checked) => {
            if (checked || pending) return;
            setPending(true);
            setError("");
            void onDisable().then(
              () => setError(""),
              () => setError(uiText("couldNotUpdate")),
            ).finally(() => setPending(false));
          }}
        />
      </div>
    </div>
  );
}
