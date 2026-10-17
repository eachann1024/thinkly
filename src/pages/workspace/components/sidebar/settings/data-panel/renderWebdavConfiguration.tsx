import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/data-panel/renderWebdavConfiguration.tsx#localMessages:1">`
zh-Hans:
  webdavConfiguration_0e03: "WebDAV 配置"
  serverUrl_f562: "服务地址"
  eGHttpsExampleComDav_f2d9: "例如 https://example.com/dav/"
  account_7035: "账号"
  emailOrUsername_515b: "邮箱或用户名"
  remoteFolder_98d0: "远端目录"
  backupFolder_534c: "备份目录"
  appPassword_1976: "应用密码"
  savedLeaveBlankToKeepIt_7b29: "已保存，留空保持不变"
  thirdPartyAppPassword_8d0a: "第三方应用密码"
  cloudBackupRetentionDays_54eb: "云端保留天数"
  afterUploadingABackupCloudBackups_2113: "上传备份后，将删除超过保留天数的云端备份。"
  automaticCloudBackups_c110: "自动云备份"
  backUpWhileTheAppIs_48b5: "距上次备份超过 24 小时后，在应用空闲时备份。"
  lastUpload_65db: "最近上传："
  lastRestore_cc8b: "最近恢复："
  saveAndCheck_8840: "保存并测试"
  backUpNow_68c4: "立即备份"
  restoreLatestBackup_31a8: "恢复最新备份"
en:
  webdavConfiguration_0e03: "WebDAV configuration"
  serverUrl_f562: "Server URL"
  eGHttpsExampleComDav_f2d9: "e.g. https://example.com/dav/"
  account_7035: "Account"
  emailOrUsername_515b: "Email or username"
  remoteFolder_98d0: "Remote folder"
  backupFolder_534c: "Backup folder"
  appPassword_1976: "App password"
  savedLeaveBlankToKeepIt_7b29: "Saved; leave blank to keep it"
  thirdPartyAppPassword_8d0a: "Third-party app password"
  cloudBackupRetentionDays_54eb: "Cloud backup retention (days)"
  afterUploadingABackupCloudBackups_2113: "After uploading a backup, cloud backups older than this period will be deleted."
  automaticCloudBackups_c110: "Automatic cloud backups"
  backUpWhileTheAppIs_48b5: "Back up while the app is idle if more than 24 hours have passed since the last backup."
  lastUpload_65db: "Last upload:"
  lastRestore_cc8b: "Last restore:"
  saveAndCheck_8840: "Save and check"
  backUpNow_68c4: "Back up now"
  restoreLatestBackup_31a8: "Restore latest backup"
ja:
  webdavConfiguration_0e03: "WebDAV の設定"
  serverUrl_f562: "サーバー URL"
  eGHttpsExampleComDav_f2d9: "例: https://example.com/dav/"
  account_7035: "アカウント"
  emailOrUsername_515b: "メールアドレスまたはユーザー名"
  remoteFolder_98d0: "リモートフォルダ"
  backupFolder_534c: "バックアップフォルダ"
  appPassword_1976: "アプリパスワード"
  savedLeaveBlankToKeepIt_7b29: "保存済みです。空欄のままにすると変更されません"
  thirdPartyAppPassword_8d0a: "サードパーティ製アプリのパスワード"
  cloudBackupRetentionDays_54eb: "クラウドバックアップの保持日数"
  afterUploadingABackupCloudBackups_2113: "バックアップのアップロード後、保持日数を超えたクラウドバックアップは削除されます。"
  automaticCloudBackups_c110: "自動クラウドバックアップ"
  backUpWhileTheAppIs_48b5: "前回のバックアップから 24 時間以上経過している場合、アプリのアイドル時にバックアップします。"
  lastUpload_65db: "最終アップロード:"
  lastRestore_cc8b: "最終復元:"
  saveAndCheck_8840: "保存してテスト"
  backUpNow_68c4: "今すぐバックアップ"
  restoreLatestBackup_31a8: "最新のバックアップを復元"
`;
const uiText = createTranslator(localMessages);
import { Switch, SwitchRow } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Upload, Cloud, RefreshCw } from "@/components/ui/icons";
import { SettingsSectionCard } from "../SettingsSectionCard";
import type { useWebdavRemoteActions } from "./useWebdavRemoteActions";

export function renderWebdavConfiguration(
  context: ReturnType<typeof useWebdavRemoteActions>,
) {
  const {
    webdavPassword,
    tempUrl,
    setTempUrl,
    tempUsername,
    setTempUsername,
    tempPassword,
    setTempPassword,
    tempRemoteDir,
    setTempRemoteDir,
    tempRetentionDays,
    setTempRetentionDays,
    tempAutoBackupEnabled,
    setTempAutoBackupEnabled,
    testing,
    uploading,
    syncingLatest,
    busy,
    hasSavedConfig,
    lastUploadText,
    lastDownloadText,
    handleSaveAndTest,
    handleUploadNow,
    handleSyncLatest,
  } = context;
  return (
    <SettingsSectionCard
      title={
        <span className="flex items-center gap-2">
          <Cloud
            className="h-4 w-4 shrink-0 text-muted-foreground"
            strokeWidth={1.75}
          />
          {uiText("webdavConfiguration_0e03")}</span>
      }
      className="pb-3"
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-normal leading-5 text-foreground">
            {uiText("serverUrl_f562")}</Label>
          <Input
            className="h-9 bg-transparent py-1 text-sm"
            value={tempUrl}
            disabled={busy}
            onChange={(e) => setTempUrl(e.target.value)}
            placeholder={uiText("eGHttpsExampleComDav_f2d9")}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-normal leading-5 text-foreground">{uiText("account_7035")}</Label>
            <Input
              className="h-9 bg-transparent py-1 text-sm"
              value={tempUsername}
              disabled={busy}
              onChange={(e) => setTempUsername(e.target.value)}
              placeholder={uiText("emailOrUsername_515b")}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-normal leading-5 text-foreground">
              {uiText("remoteFolder_98d0")}</Label>
            <Input
              className="h-9 bg-transparent py-1 text-sm"
              value={tempRemoteDir}
              disabled={busy}
              onChange={(e) => setTempRemoteDir(e.target.value)}
              placeholder={uiText("backupFolder_534c")}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-normal leading-5 text-foreground">
              {uiText("appPassword_1976")}</Label>
            <Input
              type="password"
              className="h-9 bg-transparent py-1 text-sm"
              value={tempPassword}
              disabled={busy}
              onChange={(e) => setTempPassword(e.target.value)}
              placeholder={
                webdavPassword ? uiText("savedLeaveBlankToKeepIt_7b29") : uiText("thirdPartyAppPassword_8d0a")
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-normal leading-5 text-foreground">
              {uiText("cloudBackupRetentionDays_54eb")}</Label>
            <Input
              type="number"
              min={1}
              max={365}
              className="h-9 bg-transparent py-1 text-sm"
              value={tempRetentionDays}
              disabled={busy}
              onChange={(e) =>
                setTempRetentionDays(parseInt(e.target.value) || 30)
              }
            />
            <p className="text-sm leading-relaxed text-muted-foreground">
              {uiText("afterUploadingABackupCloudBackups_2113")}</p>
          </div>
        </div>

        <SwitchRow className="flex items-center justify-between rounded-[var(--goose-control-radius)] border border-muted/20 p-3 bg-muted/10">
          <span className="block space-y-0.5 pr-4">
            <span className="text-sm font-medium leading-none text-foreground">
              {uiText("automaticCloudBackups_c110")}</span>
            <span className="block text-sm leading-relaxed text-muted-foreground">
              {uiText("backUpWhileTheAppIs_48b5")}</span>
          </span>
          <Switch
            checked={tempAutoBackupEnabled}
            onCheckedChange={setTempAutoBackupEnabled}
            disabled={busy}
          />
        </SwitchRow>

        <div className="rounded-[var(--goose-control-radius)] border border-transparent bg-[hsl(var(--goose-selected-bg)/0.58)] p-3 text-xs text-foreground dark:bg-[hsl(var(--foreground)/0.08)]">
          <div className="flex flex-col gap-1.5">
            <div>
              <strong>{uiText("lastUpload_65db")}</strong>
              <span>{lastUploadText}</span>
            </div>
            <div>
              <strong>{uiText("lastRestore_cc8b")}</strong>
              <span>{lastDownloadText}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 w-full pt-2">
          <Button
            className="w-full flex items-center justify-center gap-1.5 rounded-[var(--goose-control-radius)]"
            disabled={busy}
            onClick={handleSaveAndTest}
          >
            {testing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Cloud className="h-4 w-4" />
            )}
            {uiText("saveAndCheck_8840")}</Button>
          <Button
            variant="secondary"
            className="w-full flex items-center justify-center gap-1.5 rounded-[var(--goose-control-radius)]"
            disabled={busy || !hasSavedConfig}
            onClick={handleUploadNow}
          >
            {uploading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uiText("backUpNow_68c4")}</Button>
          <Button
            variant="secondary"
            className="w-full flex items-center justify-center gap-1.5 rounded-[var(--goose-control-radius)]"
            disabled={busy || !hasSavedConfig}
            onClick={handleSyncLatest}
          >
            {syncingLatest ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {uiText("restoreLatestBackup_31a8")}</Button>
        </div>
      </div>
    </SettingsSectionCard>
  );
}
