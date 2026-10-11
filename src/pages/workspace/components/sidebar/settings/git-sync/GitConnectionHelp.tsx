import { SettingsSectionCard } from "../SettingsSectionCard";
export function GitConnectionHelp() {
  return (
    <SettingsSectionCard>
      <details>
        <summary className="cursor-pointer text-sm font-medium">连接说明</summary>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>需要本机安装 Git，并将 SSH 公钥添加到 GitHub 或 Gitee。</li>
          <li>首次连接需要确认 SSH 主机身份；私钥设有密码时需解锁 SSH agent。</li>
          <li>正常同步在后台完成；异常会显示在同步状态中。</li>
        </ul>
      </details>
    </SettingsSectionCard>
  );
}
