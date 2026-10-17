import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/components/app-update/updatePresentation.ts#localMessages:1">`
zh-Hans:
  savingRestarting: "正在保存笔记并重启…"
  checking: "正在检查更新…"
  downloading: "正在下载{{version}}{{progress}}"
  ready: "新版本{{version}} 已就绪"
  available: "发现新版本{{version}}"
  upToDate: "已是最新版本"
en:
  savingRestarting: "Saving notes and restarting…"
  checking: "Checking for updates…"
  downloading: "Downloading{{version}}{{progress}}"
  ready: "Update{{version}} is ready"
  available: "Update{{version}} is available"
  upToDate: "You’re up to date"
ja:
  savingRestarting: "ノートを保存して再起動しています…"
  checking: "アップデートを確認しています…"
  downloading: "{{version}}をダウンロード中{{progress}}"
  ready: "新バージョン{{version}}の準備ができました"
  available: "新バージョン{{version}}があります"
  upToDate: "最新バージョンです"
`;
const uiText = createTranslator(localMessages);
import type { AppUpdateState } from "@/lib/appUpdateTypes";

export function updatePercent(state: AppUpdateState): number | undefined {
  return typeof state.percent === "number" && Number.isFinite(state.percent)
    ? Math.max(0, Math.min(100, Math.round(state.percent)))
    : undefined;
}

export function updateStatusLabel(state: AppUpdateState, installing = false, installError = ""): string {
  if (installError) return installError;
  if (installing) return uiText("savingRestarting");
  const version = state.version ? ` v${state.version}` : "";
  const percent = updatePercent(state);
  switch (state.status) {
    case "checking": return uiText("checking");
    case "downloading": return uiText("downloading", {version, progress: percent === undefined ? '…' : ` · ${percent}%`});
    case "ready": return state.message || uiText("ready", {version});
    case "available": return state.message || uiText("available", {version});
    case "up-to-date": return uiText("upToDate");
    default: return state.message || "";
  }
}
