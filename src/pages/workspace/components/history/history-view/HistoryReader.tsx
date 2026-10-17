import { useLocale } from "@/i18n";
import { type ReactNode } from "react";
import * as GooseIcons from "@/components/ui/icons";
import type { GooseIcon } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { HistoryReadOnlyEditor } from "../HistoryReadOnlyEditor";
import { useHistoryViewLogic } from "./useHistoryViewLogic";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/history/history-view/HistoryReader.tsx#messages:1">`
zh-Hans:
  loadingVersion: "正在读取历史版本"
  versionHistoryCouldNotBeLoaded: "历史列表无法读取"
  noVersionHistory: "暂无历史版本"
  thisVersionCouldNotBeRead: "此历史版本不可读取"
  ifYouUseCloudStorageSignInAnd: "若使用云盘，请确认已登录并下载此版本文件。"
  thisVersionHasAnInvalidFormat: "此历史版本格式异常"
  selectAVersionOnTheLeft: "选择左侧的历史版本"
  thisVersionIsTemporarilyUnavailable: "历史版本暂时无法显示"
  retry: "重试"
en:
  loadingVersion: "Loading version"
  versionHistoryCouldNotBeLoaded: "Version history could not be loaded"
  noVersionHistory: "No version history"
  thisVersionCouldNotBeRead: "This version could not be read"
  ifYouUseCloudStorageSignInAnd: "If you use cloud storage, sign in and download this version first."
  thisVersionHasAnInvalidFormat: "This version has an invalid format"
  selectAVersionOnTheLeft: "Select a version on the left"
  thisVersionIsTemporarilyUnavailable: "This version is temporarily unavailable"
  retry: "Retry"
ja:
  loadingVersion: "履歴バージョンを読み込み中"
  versionHistoryCouldNotBeLoaded: "履歴一覧を読み込めません"
  noVersionHistory: "履歴バージョンはまだありません"
  thisVersionCouldNotBeRead: "この履歴バージョンは読み込めません"
  ifYouUseCloudStorageSignInAnd: "クラウドストレージを使用している場合は、サインインしていることと、このバージョンのファイルがダウンロード済みであることを確認してください。"
  thisVersionHasAnInvalidFormat: "この履歴バージョンの形式が正しくありません"
  selectAVersionOnTheLeft: "左側から履歴バージョンを選択してください"
  thisVersionIsTemporarilyUnavailable: "履歴バージョンを一時的に表示できません"
  retry: "再試行"
`;
const t = createTranslator(messages);


export function HistoryReaderState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: GooseIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-[280px] items-center justify-center px-6">
      <EmptyState icon={Icon} title={title} details={description} action={action} />
    </div>
  );
}

export /**
 * 主区只读编辑器。挂在 workspace-editor-surface > page-scroll-container 内，
 * 复用与主 Editor 完全一致的滚动容器和 max-w-4xl 包裹。
 */
function HistoryReader() {
  useLocale();
  const {
    selectedContent,
    selectedVersionId,
    selectedStatus,
    isEmpty,
    indexError,
  } = useHistoryViewLogic();

  if (selectedStatus === "loading") {
    return (
      <HistoryReaderState
        icon={GooseIcons.LoaderCircle}
        title={t("loadingVersion")}
      />
    );
  }

  if (isEmpty) {
    return (
      <HistoryReaderState
        icon={indexError ? GooseIcons.FileWarning : GooseIcons.History}
        title={indexError ? t("versionHistoryCouldNotBeLoaded") : t("noVersionHistory")}
        description={indexError ?? undefined}
      />
    );
  }

  if (selectedStatus === "missing") {
    return (
      <HistoryReaderState
        icon={GooseIcons.FileQuestion}
        title={t("thisVersionCouldNotBeRead")}
        description={t("ifYouUseCloudStorageSignInAnd")}
      />
    );
  }

  if (selectedStatus === "error") {
    return (
      <HistoryReaderState
        icon={GooseIcons.FileWarning}
        title={t("thisVersionHasAnInvalidFormat")}
      />
    );
  }

  if (!(selectedContent && selectedVersionId)) {
    return (
      <HistoryReaderState
        icon={GooseIcons.MousePointerClick}
        title={t("selectAVersionOnTheLeft")}
      />
    );
  }

  return (
    <ErrorBoundary
      resetKey={selectedVersionId}
      fallback={(_, reset) => (
        <HistoryReaderState
          icon={GooseIcons.FileWarning}
          title={t("thisVersionIsTemporarilyUnavailable")}
          action={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto rounded-lg px-2 py-1 text-xs shadow-none"
              onClick={reset}
            >
              {t("retry")}
            </Button>
          }
        />
      )}
    >
      <HistoryReadOnlyEditor
        content={selectedContent}
        versionKey={selectedVersionId}
      />
    </ErrorBoundary>
  );
}
